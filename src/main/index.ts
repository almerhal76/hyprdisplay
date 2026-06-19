import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } from 'electron'
import { join } from 'path'
import { optimizer, is } from '@electron-toolkit/utils'
import iconAsset from '../../resources/icon.png?asset'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { autoUpdater } from 'electron-updater'
import * as net from 'net'

const execAsync = promisify(exec)

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('class', 'hyprdisplay')
}
app.setName('hyprdisplay')


function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    title: 'HyprDisplay Manager',
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon: iconAsset } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Set taskbar icon explicitly for some Linux environments
  if (process.platform === 'linux') {
    const iconPath = is.dev
      ? iconAsset
      : path.join(os.homedir(), '.local/share/icons/hyprdisplay.png')
    mainWindow.setIcon(nativeImage.createFromPath(iconPath))
  }

  mainWindow.on('ready-to-show', () => {
    const isHidden = process.argv.includes('--hidden')
    if (!isHidden) {
      mainWindow?.show()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('close', (event) => {
    const settingsPath = path.join(os.homedir(), '.config/nwg-react-displays/settings.json')
    let runInBg = true
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
        runInBg = settings.run_in_background !== undefined ? settings.run_in_background : true
      } catch (e) { }
    }

    if (runInBg && !(app as any).isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  // Window control IPCs
  ipcMain.handle('window_minimize', () => mainWindow?.minimize())
  ipcMain.handle('window_toggle_maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow?.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.handle('window_close', () => mainWindow?.close())
  ipcMain.handle('window_show', () => mainWindow?.show())
  ipcMain.handle('window_focus', () => mainWindow?.focus())
  ipcMain.handle('relaunch', () => {
    app.relaunch()
    app.exit()
  })
}

function createTray(): void {
  const iconPath = is.dev
    ? iconAsset
    : path.join(os.homedir(), '.local/share/icons/hyprdisplay.png')

  console.log('Using tray icon from:', iconPath)

  // Delay 500ms agar System Tray (Waybar/Polybar) siap menerima ikon
  setTimeout(() => {
    const image = nativeImage.createFromPath(iconPath)
    if (image.isEmpty()) {
      console.error('FAILED to load iconAsset for Tray.')
    }

    tray = new Tray(image)

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Settings',
        click: (): void => {
          mainWindow?.show()
          mainWindow?.focus()
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: (): void => {
          ; (app as any).isQuitting = true
          app.quit()
        }
      }
    ])
    tray.setToolTip('HyprDisplay Manager')
    tray.setContextMenu(contextMenu)

    tray.on('click', () => {
      if (mainWindow?.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow?.show()
        mainWindow?.focus()
      }
    })
  }, 500)
}

// IPC Handlers
ipcMain.handle('get_hyprland_monitors', async () => {
  try {
    const { stdout } = await execAsync('hyprctl monitors -j')
    return stdout
  } catch (error: any) {
    throw error.message
  }
})

async function syncAndApplyHyprlandConfig(isStartup = false) {
  const monitorsConfPath = path.join(os.homedir(), '.config/hypr/monitors.conf')
  let neededHeadlessCount = 0
  if (fs.existsSync(monitorsConfPath)) {
    const content = fs.readFileSync(monitorsConfPath, 'utf-8')
    const matches = content.match(/monitor=HEADLESS-[0-9]+/g)
    if (matches) {
      neededHeadlessCount = matches.length
    }
  }

  if (neededHeadlessCount > 0) {
    try {
      const { stdout } = await execAsync('hyprctl monitors -j')
      const monitors = JSON.parse(stdout)
      const currentHeadlessCount = monitors.filter((m: any) => m.name.startsWith('HEADLESS-')).length

      const missing = neededHeadlessCount - currentHeadlessCount
      if (missing > 0) {
        console.log(`Creating ${missing} missing headless monitor(s)...`)
        for (let i = 0; i < missing; i++) {
          await execAsync('hyprctl output create headless')
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }
    } catch (e) {
      console.error('Failed to sync headless monitors:', e)
    }
  }

  // Apply monitor configurations dynamically using hyprctl keyword to force-update positions/settings instantly
  if (fs.existsSync(monitorsConfPath)) {
    try {
      const content = fs.readFileSync(monitorsConfPath, 'utf-8')
      const lines = content.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        const match = trimmed.match(/^monitor\s*=\s*(.+)$/)
        if (match) {
          const rule = match[1].trim()
          await execAsync(`hyprctl keyword monitor "${rule}"`)
        }
      }
    } catch (e) {
      console.error('Failed to apply monitor config using hyprctl keyword:', e)
    }
  }

  spawn('hyprctl', ['reload'])

  if (isStartup) {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('Sending startup_monitor_sync_completed event to renderer...')
        mainWindow.webContents.send('startup_monitor_sync_completed')
      }
    }, 1000)
  }
}

function convertMonitorsConfToLua(config: string): string {
  const lines = config.split('\n')
  const luaRules: string[] = []

  luaRules.push('-- Generated by hyprdisplay-electron. Do not edit manually.\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^monitor\s*=\s*([^,]+),([^,]+),([^,]+),([^,]+)(?:,transform,([^,]+))?/)
    if (match) {
      const output = match[1].trim()
      const mode = match[2].trim()
      const position = match[3].trim()
      const scale = parseFloat(match[4].trim())
      const transform = match[5] ? parseInt(match[5].trim()) : null

      let luaObj = `hl.monitor({\n`
      luaObj += `    output = "${output}",\n`
      luaObj += `    mode = "${mode}",\n`
      luaObj += `    position = "${position}",\n`
      luaObj += `    scale = ${scale}`
      if (transform !== null) {
        luaObj += `,\n    transform = ${transform}`
      }
      luaObj += `\n})`
      luaRules.push(luaObj)
    } else if (trimmed === 'monitor=,preferred,auto,1') {
      luaRules.push(`hl.monitor({\n    output = "",\n    mode = "preferred",\n    position = "auto",\n    scale = 1\n})`)
    } else {
      const disableMatch = trimmed.match(/^monitor\s*=\s*([^,]+),disable/)
      if (disableMatch) {
        const output = disableMatch[1].trim()
        luaRules.push(`hl.monitor({\n    output = "${output}",\n    disabled = true\n})`)
      }
    }
  }

  return luaRules.join('\n\n') + '\n'
}

function convertWorkspacesConfToLua(config: string): string {
  const lines = config.split('\n')
  const luaRules: string[] = []

  luaRules.push('-- Generated by hyprdisplay-electron. Do not edit manually.\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^workspace\s*=\s*([^,]+),monitor:([^,]+)(?:,default:(true|false))?/)
    if (match) {
      const workspace = match[1].trim()
      const monitor = match[2].trim()
      const isDefault = match[3] === 'true'

      let luaObj = `hl.workspace_rule({\n`
      luaObj += `    workspace = "${workspace}",\n`
      luaObj += `    monitor = "${monitor}"`
      if (isDefault) {
        luaObj += `,\n    default = true`
      }
      luaObj += `\n})`
      luaRules.push(luaObj)
    }
  }

  return luaRules.join('\n\n') + '\n'
}

function convertEnvConfToLua(content: string): string {
  const lines = content.split('\n')
  const luaLines: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^env\s*=\s*([^,]+),(.+)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      luaLines.push(`hl.env("${key}", "${value}")`)
    }
  }
  return luaLines.join('\n')
}

function convertExecsConfToLua(content: string): string {
  const lines = content.split('\n')
  const luaLines: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^exec-once\s*=\s*(.+)$/)
    if (match) {
      const cmd = match[1].trim()
      luaLines.push(`    hl.exec_cmd("${cmd}")`)
    }
  }
  return luaLines.join('\n')
}

function updateLuaCustomFile(filePath: string, luaContent: string, isExecs = false) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const startMarker = '-- [nwg-react-displays] start'
  const endMarker = '-- [nwg-react-displays] end'

  let currentContent = ''
  if (fs.existsSync(filePath)) {
    currentContent = fs.readFileSync(filePath, 'utf-8')
  } else {
    if (isExecs) {
      currentContent = `-- Custom configurations\nhl.on("hyprland.start", function ()\n${startMarker}\n${endMarker}\nend)\n`
    } else {
      currentContent = `-- Custom configurations\n${startMarker}\n${endMarker}\n`
    }
  }

  const lines = currentContent.split('\n')
  const newLines: string[] = []
  let inSection = false
  let sectionUpdated = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === startMarker) {
      inSection = true
      newLines.push(line)
      newLines.push(luaContent)
      sectionUpdated = true
      continue
    }
    if (trimmed === endMarker) {
      inSection = false
      newLines.push(line)
      continue
    }
    if (!inSection) {
      newLines.push(line)
    }
  }

  if (!sectionUpdated) {
    if (isExecs) {
      let insertIndex = -1
      for (let i = 0; i < newLines.length; i++) {
        if (newLines[i].includes('hl.on("hyprland.start"')) {
          insertIndex = i + 1
          break
        }
      }
      if (insertIndex !== -1) {
        newLines.splice(insertIndex, 0, startMarker, luaContent, endMarker)
      } else {
        newLines.push(startMarker)
        newLines.push(luaContent)
        newLines.push(endMarker)
      }
    } else {
      newLines.push(startMarker)
      newLines.push(luaContent)
      newLines.push(endMarker)
    }
  }

  fs.writeFileSync(filePath, newLines.join('\n'))
}

ipcMain.handle('apply_hyprland_config', async (_, args: { config: string }) => {
  const filePath = path.join(os.homedir(), '.config/hypr/monitors.conf')
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, args.config)

  // Write monitors.lua as well
  try {
    const luaConfig = convertMonitorsConfToLua(args.config)
    const luaFilePath = path.join(os.homedir(), '.config/hypr/monitors.lua')
    fs.writeFileSync(luaFilePath, luaConfig)
  } catch (err) {
    console.error('Failed to write monitors.lua:', err)
  }

  await syncAndApplyHyprlandConfig()
  return
})

ipcMain.handle('get_executable_path', async () => {
  return process.env.APPIMAGE || process.execPath
})

ipcMain.handle('get_app_version', async () => {
  return app.getVersion()
})

ipcMain.handle('apply_workspace_config', async (_, args: { config: string }) => {
  const filePath = path.join(os.homedir(), '.config/hypr/workspaces.conf')
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  let hasChanged = false
  if (fs.existsSync(filePath)) {
    const existingConfig = fs.readFileSync(filePath, 'utf-8')
    if (existingConfig.trim() !== args.config.trim()) {
      hasChanged = true
    }
  } else {
    if (args.config.trim() !== '') {
      hasChanged = true
    }
  }

  fs.writeFileSync(filePath, args.config)

  // Write workspaces.lua as well
  try {
    const luaConfig = convertWorkspacesConfToLua(args.config)
    const luaFilePath = path.join(os.homedir(), '.config/hypr/workspaces.lua')
    fs.writeFileSync(luaFilePath, luaConfig)
  } catch (err) {
    console.error('Failed to write workspaces.lua:', err)
  }

  if (hasChanged) {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: 'Reboot Diperlukan',
        body: 'Perubahan pada workspace telah diterapkan. Silakan reboot sistem agar perubahan terlihat.',
        icon: path.join(os.homedir(), '.local/share/icons/hyprdisplay.png')
      })
      notification.show()
    }
  }

  return hasChanged
})

ipcMain.handle('update_custom_config', async (_, args: { filename: string, content: string }) => {
  const filePath = path.join(os.homedir(), '.config/hypr/custom', args.filename)
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const startMarker = '# [nwg-react-displays] start'
  const endMarker = '# [nwg-react-displays] end'

  let currentContent = ''
  if (fs.existsSync(filePath)) {
    currentContent = fs.readFileSync(filePath, 'utf-8')
  }

  const lines = currentContent.split('\n')
  const newLines: string[] = []
  let inSection = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === startMarker) {
      inSection = true
      continue
    }
    if (trimmed === endMarker) {
      inSection = false
      continue
    }
    if (!inSection) {
      newLines.push(line)
    }
  }

  if (newLines.length > 0 && newLines[newLines.length - 1].trim() !== '') {
    newLines.push('')
  }

  newLines.push(startMarker)
  newLines.push(args.content)
  newLines.push(endMarker)

  fs.writeFileSync(filePath, newLines.join('\n'))

  // Write corresponding Lua custom config
  if (args.filename === 'env.conf') {
    try {
      const luaContent = convertEnvConfToLua(args.content)
      const luaFilePath = path.join(os.homedir(), '.config/hypr/custom/env.lua')
      updateLuaCustomFile(luaFilePath, luaContent, false)
    } catch (err) {
      console.error('Failed to update env.lua:', err)
    }
  } else if (args.filename === 'execs.conf') {
    try {
      const luaContent = convertExecsConfToLua(args.content)
      const luaFilePath = path.join(os.homedir(), '.config/hypr/custom/execs.lua')
      updateLuaCustomFile(luaFilePath, luaContent, true)
    } catch (err) {
      console.error('Failed to update execs.lua:', err)
    }
  }

  return
})

ipcMain.handle('save_profile', async (_, args: { name: string, data: string }) => {
  const filePath = path.join(os.homedir(), '.config/nwg-react-displays/profiles', `${args.name}.json`)
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, args.data)
  return
})

ipcMain.handle('get_profiles', async () => {
  const dir = path.join(os.homedir(), '.config/nwg-react-displays/profiles')
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
})

ipcMain.handle('load_profile', async (_, args: { name: string }) => {
  const filePath = path.join(os.homedir(), '.config/nwg-react-displays/profiles', `${args.name}.json`)
  if (!fs.existsSync(filePath)) return JSON.stringify({ monitors: [], layoutFrames: [] })
  return fs.readFileSync(filePath, 'utf-8')
})

ipcMain.handle('delete_profile', async (_, args: { name: string }) => {
  const filePath = path.join(os.homedir(), '.config/nwg-react-displays/profiles', `${args.name}.json`)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  return
})

ipcMain.handle('save_last_profile', async (_, args: { name: string }) => {
  const filePath = path.join(os.homedir(), '.config/nwg-react-displays/settings.json')
  let settings: any = {}
  if (fs.existsSync(filePath)) {
    try { settings = JSON.parse(fs.readFileSync(filePath, 'utf-8')) } catch (e) { }
  }
  settings.last_profile = args.name
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2))
  return
})

ipcMain.handle('get_last_profile', async () => {
  const filePath = path.join(os.homedir(), '.config/nwg-react-displays/settings.json')
  if (fs.existsSync(filePath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      return settings.last_profile || 'Default'
    } catch (e) { }
  }
  return 'Default'
})

ipcMain.handle('get_custom_config', async (_, args: { filename: string }) => {
  const filePath = path.join(os.homedir(), '.config/hypr/custom', args.filename)
  if (!fs.existsSync(filePath)) return ''
  return fs.readFileSync(filePath, 'utf-8')
})

ipcMain.handle('get_monitors_config', async () => {
  const filePath = path.join(os.homedir(), '.config/hypr/monitors.conf')
  if (!fs.existsSync(filePath)) return ''
  return fs.readFileSync(filePath, 'utf-8')
})

ipcMain.handle('get_background_mode', async () => {
  const filePath = path.join(os.homedir(), '.config/nwg-react-displays/settings.json')
  if (fs.existsSync(filePath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      return settings.run_in_background !== undefined ? settings.run_in_background : true
    } catch (e) { }
  }
  return true
})

ipcMain.handle('set_background_mode', async (_, { enabled }: { enabled: boolean }) => {
  const filePath = path.join(os.homedir(), '.config/nwg-react-displays/settings.json')
  let settings: any = {}
  if (fs.existsSync(filePath)) {
    try { settings = JSON.parse(fs.readFileSync(filePath, 'utf-8')) } catch (e) { }
  }
  settings.run_in_background = enabled
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2))
  return true
})

ipcMain.handle('get_auto_apply', async () => {
  const filePath = path.join(os.homedir(), '.config/nwg-react-displays/settings.json')
  if (fs.existsSync(filePath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      return settings.auto_apply !== undefined ? settings.auto_apply : true
    } catch (e) { }
  }
  return true
})

ipcMain.handle('set_auto_apply', async (_, enabled: boolean) => {
  const filePath = path.join(os.homedir(), '.config/nwg-react-displays/settings.json')
  let settings: any = {}
  if (fs.existsSync(filePath)) {
    try { settings = JSON.parse(fs.readFileSync(filePath, 'utf-8')) } catch (e) { }
  }
  settings.auto_apply = enabled
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2))
  return true
})

ipcMain.handle('get_startup_mode', async () => {
  return app.getLoginItemSettings().openAtLogin
})

ipcMain.handle('set_startup_mode', async (_, { enabled }: { enabled: boolean }) => {
  const executablePath = process.env.APPIMAGE || process.execPath
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true,
    path: executablePath,
    args: ['--hidden']
  })
  return true
})

const activeOverlayProcesses = new Map<string, any>()

async function identifyMonitors(targetMonitorName?: string): Promise<void> {
  // Terminate existing overlays for the target monitor(s) to avoid duplicates
  if (targetMonitorName) {
    const existing = activeOverlayProcesses.get(targetMonitorName)
    if (existing) {
      try {
        existing.kill()
      } catch (e) {}
      activeOverlayProcesses.delete(targetMonitorName)
    }
  } else {
    activeOverlayProcesses.forEach((proc) => {
      try {
        proc.kill()
      } catch (e) {}
    })
    activeOverlayProcesses.clear()
  }

  let hyprMonitors: any[] = []
  try {
    const { stdout } = await execAsync('hyprctl monitors -j')
    hyprMonitors = JSON.parse(stdout)
  } catch (e) {
    console.error('Failed to get hyprland monitors', e)
    return
  }

  // Gunakan path.resolve agar lebih pasti
  let scriptPath = ""
  if (is.dev) {
    scriptPath = path.resolve(process.cwd(), 'resources/scripts/overlay.py')
  } else {
    // Di production, file yang di-unpack ada di app.asar.unpacked
    scriptPath = path.join(process.resourcesPath, 'app.asar.unpacked/resources/scripts/overlay.py')
  }

  console.log('Spawning overlay from:', scriptPath)

  hyprMonitors.forEach((m, index) => {
    // Jika targetMonitorName diberikan, lewatkan monitor yang tidak cocok
    if (targetMonitorName && m.name !== targetMonitorName) return

    // Ensure we kill any existing process for this monitor before spawning a new one
    const existing = activeOverlayProcesses.get(m.name)
    if (existing) {
      try {
        existing.kill()
      } catch (e) {}
      activeOverlayProcesses.delete(m.name)
    }

    const monLabel = m.description || m.name
    
    // Spawn dengan penanganan error yang lebih baik
    const pyProcess = spawn('python3', [
      '-u',
      scriptPath,
      m.name,
      monLabel,
      '4000',
      (index + 1).toString(),
      index.toString()
    ])

    activeOverlayProcesses.set(m.name, pyProcess)

    pyProcess.stdout.on('data', (data) => console.log(`Python Output [${m.name}]: ${data}`));
    pyProcess.stderr.on('data', (data) => console.error(`Python Error [${m.name}]: ${data}`));
    
    pyProcess.on('error', (err) => {
      console.error(`Failed to start Python process for ${m.name}:`, err);
    });

    pyProcess.on('close', () => {
      if (activeOverlayProcesses.get(m.name) === pyProcess) {
        activeOverlayProcesses.delete(m.name)
      }
    });
  })
}

ipcMain.handle('identify_monitors', async () => {
  await identifyMonitors()
})

ipcMain.handle('identify_single_monitor', async (_, monitorName: string) => {
  await identifyMonitors(monitorName)
})

ipcMain.handle('exit_app', () => {
  ; (app as any).isQuitting = true
  app.quit()
})

ipcMain.handle('check_for_updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates()
    return result
  } catch (err: any) {
    console.error('Failed to check for updates:', err)
    throw err.message
  }
})

ipcMain.handle('quit_and_install', async () => {
  console.log('Relaunching app to install updates...')
  ; (app as any).isQuitting = true
  autoUpdater.quitAndInstall()
})

function initializeUpdater(): void {
  autoUpdater.logger = console
  autoUpdater.autoDownload = true

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...')
    mainWindow?.webContents.send('update_status', 'checking')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version)
    mainWindow?.webContents.send('update_status', 'available', info.version)
  })

  autoUpdater.on('update-not-available', () => {
    console.log('Update not available.')
    mainWindow?.webContents.send('update_status', 'not-available')
  })

  autoUpdater.on('error', (err) => {
    console.error('Update error:', err)
    mainWindow?.webContents.send('update_status', 'error', err.message)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`Download progress: ${progressObj.percent}%`)
    mainWindow?.webContents.send('update_progress', progressObj.percent)
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version)
    mainWindow?.webContents.send('update_status', 'downloaded', info.version)
  })
}

ipcMain.handle('set_autostart', async (_, enabled: boolean) => {
  if (process.platform !== 'linux') return false
  
  const autostartDir = path.join(os.homedir(), '.config/autostart')
  const desktopFilePath = path.join(autostartDir, 'hyprdisplay.desktop')
  const executablePath = process.env.APPIMAGE || process.execPath

  try {
    if (!fs.existsSync(autostartDir)) {
      fs.mkdirSync(autostartDir, { recursive: true })
    }

    if (enabled) {
      const settingsPath = path.join(os.homedir(), '.config/nwg-react-displays/settings.json')
      let startHidden = false
      if (fs.existsSync(settingsPath)) {
        try {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
          startHidden = settings.start_hidden !== undefined ? settings.start_hidden : false
        } catch (e) {}
      }

      const execValue = startHidden ? `${executablePath} --hidden` : executablePath

      const desktopContent = `[Desktop Entry]
Name=hyprdisplay
Comment=Hyprland Monitor Manager
Exec=${execValue}
Icon=hyprdisplay
Terminal=false
Type=Application
Categories=Settings;
X-GNOME-Autostart-enabled=true
`
      fs.writeFileSync(desktopFilePath, desktopContent)
      return true
    } else {
      if (fs.existsSync(desktopFilePath)) {
        fs.unlinkSync(desktopFilePath)
      }
      return false
    }
  } catch (err) {
    console.error('Failed to handle autostart:', err)
    return false
  }
})

ipcMain.handle('get_start_hidden', async () => {
  const filePath = path.join(os.homedir(), '.config/nwg-react-displays/settings.json')
  if (fs.existsSync(filePath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      return settings.start_hidden !== undefined ? settings.start_hidden : false
    } catch (e) { }
  }
  return false
})

ipcMain.handle('set_start_hidden', async (_, enabled: boolean) => {
  const filePath = path.join(os.homedir(), '.config/nwg-react-displays/settings.json')
  let settings: any = {}
  if (fs.existsSync(filePath)) {
    try { settings = JSON.parse(fs.readFileSync(filePath, 'utf-8')) } catch (e) { }
  }
  settings.start_hidden = enabled
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2))

  // Re-sync autostart file if autostart is currently enabled
  const autostartFilePath = path.join(os.homedir(), '.config/autostart/hyprdisplay.desktop')
  if (fs.existsSync(autostartFilePath)) {
    const executablePath = process.env.APPIMAGE || process.execPath
    const execValue = enabled ? `${executablePath} --hidden` : executablePath
    try {
      const content = fs.readFileSync(autostartFilePath, 'utf-8')
      const lines = content.split('\n').map(line => {
        if (line.startsWith('Exec=')) return `Exec=${execValue}`
        return line
      })
      fs.writeFileSync(autostartFilePath, lines.join('\n'))
    } catch (err) {
      console.error('Failed to update autostart Exec flag:', err)
    }
  }
  return true
})

ipcMain.handle('get_autostart', async () => {
  if (process.platform !== 'linux') return false
  const desktopFilePath = path.join(os.homedir(), '.config/autostart/hyprdisplay.desktop')
  return fs.existsSync(desktopFilePath)
})

// Virtual displays and wayvnc process management state
const activeWayVncProcesses = new Map<string, { process: any, port: number }>()

ipcMain.handle('get_local_ips', async () => {
  const interfaces = os.networkInterfaces()
  const ips: string[] = []
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address)
      }
    }
  }
  return ips
})

ipcMain.handle('create_virtual_monitor', async () => {
  try {
    const { stdout: beforeOut } = await execAsync('hyprctl monitors -j')
    const beforeMonitors = JSON.parse(beforeOut).map((m: any) => m.name)

    await execAsync('hyprctl output create headless')

    // Wait a brief moment for the compositor to register the new output
    await new Promise((resolve) => setTimeout(resolve, 500))

    const { stdout: afterOut } = await execAsync('hyprctl monitors -j')
    const afterMonitors = JSON.parse(afterOut).map((m: any) => m.name)

    const newMonitor = afterMonitors.find((m: any) => !beforeMonitors.includes(m))
    return { success: true, name: newMonitor || 'HEADLESS-1' }
  } catch (error: any) {
    console.error('Failed to create virtual monitor:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('remove_virtual_monitor', async (_, name: string) => {
  try {
    const stream = activeWayVncProcesses.get(name)
    if (stream) {
      stream.process.kill()
      activeWayVncProcesses.delete(name)
    }

    await execAsync(`hyprctl output remove ${name}`)
    return { success: true }
  } catch (error: any) {
    console.error('Failed to remove virtual monitor:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('start_vnc_stream', async (_, { monitorName, port, password }: { monitorName: string, port: number, password?: string }) => {
  try {
    try {
      await execAsync('which wayvnc')
    } catch (e) {
      return { success: false, error: 'wayvnc_missing' }
    }

    if (activeWayVncProcesses.has(monitorName)) {
      const existing = activeWayVncProcesses.get(monitorName)
      existing?.process.kill()
      activeWayVncProcesses.delete(monitorName)
    }

    // Set unique control socket path to prevent conflicts
    const socketPath = `/tmp/wayvncctl-${monitorName}`
    if (fs.existsSync(socketPath)) {
      try {
        fs.unlinkSync(socketPath)
      } catch (err) {
        console.error('Failed to unlink stale wayvnc socket:', err)
      }
    }

    const args = [
      '-Ltrace',
      '-r',
      '-S', socketPath,
      '-o', monitorName
    ];

    if (password && password.trim() !== "") {
      const certsDir = path.join(os.homedir(), '.config/hyprdisplay/wayvnc_certs');
      if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

      const tlsCert = path.join(certsDir, 'tls_cert.pem');
      const tlsKey = path.join(certsDir, 'tls_key.pem');
      const rsaKey = path.join(certsDir, 'rsa_key.pem');
      
      if (!fs.existsSync(tlsCert) || !fs.existsSync(tlsKey)) {
        await execAsync(`openssl req -new -x509 -days 3650 -nodes -out "${tlsCert}" -keyout "${tlsKey}" -subj "/CN=hyprdisplay"`);
      }
      if (!fs.existsSync(rsaKey)) {
        await execAsync(`openssl genrsa -traditional -out "${rsaKey}" 2048`);
      }

      const configPath = `/tmp/wayvnc_config_${monitorName}`;
      const configContent = `address=0.0.0.0\nport=${port}\nenable_auth=true\nusername=user\npassword=${password.trim()}\nrsa_private_key_file=${rsaKey}\nprivate_key_file=${tlsKey}\ncertificate_file=${tlsCert}\nrelax_encryption=true\n`;
      fs.writeFileSync(configPath, configContent);
      args.push('-C', configPath);
      console.log(`Starting wayvnc for ${monitorName} on port ${port} with password auth...`);
    } else {
      args.push('0.0.0.0', port.toString());
      console.log(`Starting wayvnc for ${monitorName} on port ${port}...`);
    }

    const wayvncProc = spawn('wayvnc', args)

    // Automatically attempt to run adb reverse for seamless Android USB connection
    try {
      execAsync(`adb reverse tcp:${port} tcp:${port}`)
        .then(() => console.log(`[ADB] Successfully ran adb reverse tcp:${port} tcp:${port}`))
        .catch((err) => console.log(`[ADB Hint] adb reverse failed or no device connected (this is normal if not using USB):`, err.message));
    } catch (e) {}

    wayvncProc.stdout.on('data', (data) => console.log(`[wayvnc ${monitorName}]: ${data}`))
    wayvncProc.stderr.on('data', (data) => console.error(`[wayvnc ${monitorName}]: ${data}`))

    wayvncProc.on('error', (err) => {
      console.error(`Failed to start wayvnc for ${monitorName}:`, err)
    })

    wayvncProc.on('close', (code) => {
      console.log(`wayvnc for ${monitorName} exited with code ${code}`)
      if (activeWayVncProcesses.get(monitorName)?.process === wayvncProc) {
        activeWayVncProcesses.delete(monitorName)
      }
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send('vnc_status_changed', { 
          monitorName, 
          active: false, 
          code, 
          error: code !== 0 ? 'capture_failed' : undefined 
        })
      }
    });

    activeWayVncProcesses.set(monitorName, { process: wayvncProc, port })
    return { success: true, port }
  } catch (error: any) {
    console.error('Failed to start VNC stream:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('stop_vnc_stream', async (_, monitorName: string) => {
  const stream = activeWayVncProcesses.get(monitorName)
  if (stream) {
    stream.process.kill()
    activeWayVncProcesses.delete(monitorName)
    return { success: true }
  }
  return { success: false, error: 'no_active_stream' }
})

ipcMain.handle('get_vnc_status', async () => {
  let wayvncInstalled = false
  try {
    await execAsync('which wayvnc')
    wayvncInstalled = true
  } catch (e) {}

  const activeStreams: { [key: string]: number } = {}
  activeWayVncProcesses.forEach((val, key) => {
    activeStreams[key] = val.port
  })

  return { wayvncInstalled, activeStreams }
})

// Cursor configuration helpers and IPC handlers
async function getAvailableCursorThemes(): Promise<string[]> {
  const searchPaths = [
    path.join(os.homedir(), '.icons'),
    path.join(os.homedir(), '.local/share/icons'),
    '/usr/share/icons',
    '/usr/local/share/icons'
  ];

  const themes = new Set<string>();

  for (const dir of searchPaths) {
    if (fs.existsSync(dir)) {
      try {
        const subdirs = fs.readdirSync(dir);
        for (const subdir of subdirs) {
          const cursorsPath = path.join(dir, subdir, 'cursors');
          if (fs.existsSync(cursorsPath) && fs.statSync(cursorsPath).isDirectory()) {
            themes.add(subdir);
          }
        }
      } catch (err) {
        console.error(`Error reading cursor dir ${dir}:`, err);
      }
    }
  }

  return Array.from(themes).sort();
}

ipcMain.handle('get_cursor_themes', async () => {
  return await getAvailableCursorThemes();
});

ipcMain.handle('get_cursor_settings', async () => {
  const filePath = path.join(os.homedir(), '.config/nwg-react-displays/settings.json');
  let settings: any = {};
  if (fs.existsSync(filePath)) {
    try {
      settings = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {}
  }

  let defaultTheme = settings.cursor_theme;
  let defaultSize = settings.cursor_size;

  if (!defaultTheme) {
    try {
      const { stdout } = await execAsync("gsettings get org.gnome.desktop.interface cursor-theme");
      defaultTheme = stdout.trim().replace(/'/g, "");
    } catch (e) {
      defaultTheme = "Adwaita";
    }
  }

  if (!defaultSize) {
    try {
      const { stdout } = await execAsync("gsettings get org.gnome.desktop.interface cursor-size");
      defaultSize = parseInt(stdout.trim()) || 24;
    } catch (e) {
      defaultSize = 24;
    }
  }

  return { theme: defaultTheme, size: defaultSize };
});

ipcMain.handle('apply_cursor_settings', async (_, { theme, size }: { theme: string, size: number }) => {
  // A. Apply dynamically in active Hyprland session
  try {
    await execAsync(`hyprctl setcursor ${theme} ${size}`);
  } catch (e) {
    console.error("Failed to run hyprctl setcursor:", e);
  }

  // B. Apply for GTK applications
  try {
    await execAsync(`gsettings set org.gnome.desktop.interface cursor-theme '${theme}'`);
    await execAsync(`gsettings set org.gnome.desktop.interface cursor-size ${size}`);
  } catch (e) {
    console.error("Failed to run gsettings:", e);
  }

  // C. Save to app settings
  const settingsPath = path.join(os.homedir(), '.config/nwg-react-displays/settings.json');
  let settings: any = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch (e) {}
  }
  settings.cursor_theme = theme;
  settings.cursor_size = size;
  const settingsDir = path.dirname(settingsPath);
  if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

  // D. Write env variables to env.conf
  const envPath = path.join(os.homedir(), '.config/hypr/custom/env.conf');
  const envDir = path.dirname(envPath);
  if (!fs.existsSync(envDir)) fs.mkdirSync(envDir, { recursive: true });

  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  const lines = envContent.split('\n');
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();
    return !(
      trimmed.startsWith('env = XCURSOR_THEME,') ||
      trimmed.startsWith('env = XCURSOR_SIZE,') ||
      trimmed.startsWith('env = HYPRCURSOR_THEME,') ||
      trimmed.startsWith('env = HYPRCURSOR_SIZE,')
    );
  });

  const cursorEnv = [
    `env = XCURSOR_THEME,${theme}`,
    `env = XCURSOR_SIZE,${size}`,
    `env = HYPRCURSOR_THEME,${theme}`,
    `env = HYPRCURSOR_SIZE,${size}`
  ];

  cleanedLines.unshift(...cursorEnv);

  const newContent = cleanedLines.join('\n');
  fs.writeFileSync(envPath, newContent);

  // Sync to env.lua
  try {
    const luaContent = convertEnvConfToLua(newContent);
    const luaFilePath = path.join(os.homedir(), '.config/hypr/custom/env.lua');
    updateLuaCustomFile(luaFilePath, luaContent, false);
  } catch (err) {
    console.error('Failed to update env.lua:', err);
  }

  return true;
});

ipcMain.handle('get_cursor_theme_preview', async (_, themeName: string) => {
  const searchPaths = [
    path.join(os.homedir(), '.icons'),
    path.join(os.homedir(), '.local/share/icons'),
    '/usr/share/icons',
    '/usr/local/share/icons'
  ];

  for (const dir of searchPaths) {
    const themePath = path.join(dir, themeName);
    if (fs.existsSync(themePath) && fs.statSync(themePath).isDirectory()) {
      // 1. Try to find preview.gif, preview.png, or thumbnail.png first
      const previewPaths = [
        path.join(themePath, 'preview.gif'),
        path.join(themePath, 'preview.png'),
        path.join(themePath, 'thumbnail.png'),
        path.join(themePath, 'icon.png')
      ];

      for (const p of previewPaths) {
        if (fs.existsSync(p)) {
          try {
            const mimeType = p.endsWith('.gif') ? 'image/gif' : 'image/png';
            const base64 = fs.readFileSync(p).toString('base64');
            return `data:${mimeType};base64,${base64}`;
          } catch (err) {
            console.error(`Error reading preview image ${p}:`, err);
          }
        }
      }

      // 2. Try to parse left_ptr or default cursor file
      const cursorFiles = [
        path.join(themePath, 'cursors', 'left_ptr'),
        path.join(themePath, 'cursors', 'default'),
        path.join(themePath, 'cursors', 'pointer')
      ];

      for (const file of cursorFiles) {
        if (fs.existsSync(file)) {
          try {
            const buffer = fs.readFileSync(file);
            if (buffer.length < 16) continue;
            const magic = buffer.readUInt32LE(0);
            if (magic !== 0x72756358) continue; // 'Xcur'

            const ntoc = buffer.readUInt32LE(12);
            if (buffer.length < 16 + ntoc * 12) continue;

            let bestTocEntry: { subtype: number; position: number } | null = null;
            let bestSizeDiff = Infinity;
            const targetSize = 32; // We prefer 32x32 for preview

            for (let i = 0; i < ntoc; i++) {
              const offset = 16 + i * 12;
              const type = buffer.readUInt32LE(offset);
              const subtype = buffer.readUInt32LE(offset + 4);
              const position = buffer.readUInt32LE(offset + 8);

              if (type === 0xfffd0002) {
                const sizeDiff = Math.abs(subtype - targetSize);
                if (sizeDiff < bestSizeDiff) {
                  bestSizeDiff = sizeDiff;
                  bestTocEntry = { subtype, position };
                }
              }
            }

            if (bestTocEntry) {
              const pos = bestTocEntry.position;
              if (buffer.length < pos + 36) continue;

              const chunkHeaderSize = buffer.readUInt32LE(pos);
              const width = buffer.readUInt32LE(pos + 16);
              const height = buffer.readUInt32LE(pos + 20);

              const pixelOffset = pos + chunkHeaderSize;
              const pixelLength = width * height * 4;

              if (buffer.length < pixelOffset + pixelLength) continue;

              const pixelsBuffer = buffer.slice(pixelOffset, pixelOffset + pixelLength);

              // Convert BGRA raw bitmap to PNG using Electron nativeImage
              const img = nativeImage.createFromBitmap(pixelsBuffer, { width, height });
              return img.toDataURL();
            }
          } catch (err) {
            console.error(`Error parsing Xcursor file ${file}:`, err);
          }
        }
      }
    }
  }

  return null;
});

export function registerDesktopEntry(): void {
  if (process.platform !== 'linux') return

  const desktopDir = path.join(os.homedir(), '.local/share/applications')
  const iconDir = path.join(os.homedir(), '.local/share/icons')
  
  if (!fs.existsSync(desktopDir)) fs.mkdirSync(desktopDir, { recursive: true })
  if (!fs.existsSync(iconDir)) fs.mkdirSync(iconDir, { recursive: true })

  const desktopFilePath = path.join(desktopDir, 'HyprDisplay.desktop')
  const permanentIconPath = path.join(iconDir, 'HyprDisplay.png')
  const executablePath = process.env.APPIMAGE || process.execPath
  
  const sourceIconPath = is.dev
    ? path.join(process.cwd(), 'resources/icon.png')
    : path.join(process.resourcesPath, 'app.asar.unpacked/resources/icon.png')

  try {
    if (fs.existsSync(sourceIconPath)) {
      fs.copyFileSync(sourceIconPath, permanentIconPath)
    }
  } catch (err) {
    console.error('Failed to copy icon:', err)
  }

  const desktopContent = `[Desktop Entry]
Name=HyprDisplay Manager
Comment=Manage Hyprland monitor layouts and workspaces
Exec=${executablePath} %U
Icon=HyprDisplay
Terminal=false
Type=Application
Categories=Settings;DesktopSettings;Qt;GTK;
StartupWMClass=HyprDisplay
`

  try {
    fs.writeFileSync(desktopFilePath, desktopContent)
  } catch (err) {
    console.error('Failed to write desktop file:', err)
  }
}

function syncAutostartPath(): void {
  const currentPath = process.env.APPIMAGE || process.execPath
  const autostartDir = path.join(os.homedir(), '.config/autostart')
  const desktopFilePath = path.join(autostartDir, 'hyprdisplay.desktop')

  if (fs.existsSync(desktopFilePath)) {
    try {
      const content = fs.readFileSync(desktopFilePath, 'utf-8')
      
      const settingsPath = path.join(os.homedir(), '.config/nwg-react-displays/settings.json')
      let startHidden = false
      if (fs.existsSync(settingsPath)) {
        try {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
          startHidden = settings.start_hidden !== undefined ? settings.start_hidden : false
        } catch (e) {}
      }

      const expectedExec = startHidden ? `Exec=${currentPath} --hidden` : `Exec=${currentPath}`

      if (!content.includes(expectedExec)) {
        console.log('Syncing autostart path to expected Exec:', expectedExec)
        const lines = content.split('\n').map(line => {
          if (line.startsWith('Exec=')) return expectedExec
          return line
        })
        fs.writeFileSync(desktopFilePath, lines.join('\n'))
      }
    } catch (err) {
      console.error('Failed to sync autostart path:', err)
    }
  }

  // Also sync the execs.conf path
  const execsFilePath = path.join(os.homedir(), '.config/hypr/custom/execs.conf')
  if (fs.existsSync(execsFilePath)) {
    try {
      let content = fs.readFileSync(execsFilePath, 'utf-8')
      const startMarker = '# [nwg-react-displays] start'
      const endMarker = '# [nwg-react-displays] end'

      if (content.includes(startMarker) && content.includes(endMarker)) {
        const lines = content.split('\n')
        const newLines: string[] = []
        let inSection = false

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed === startMarker) {
            inSection = true
            newLines.push(line)
            newLines.push(`exec-once = ${currentPath} --apply`)
            continue
          }
          if (trimmed === endMarker) {
            inSection = false
            newLines.push(line)
            continue
          }
          if (!inSection) {
            newLines.push(line)
          }
        }
        
        const newContent = newLines.join('\n')
        if (content !== newContent) {
          console.log('Syncing execs.conf path to current executable:', currentPath)
          fs.writeFileSync(execsFilePath, newContent)
        }
      }
    } catch (err) {
      console.error('Failed to sync execs.conf path:', err)
    }
  }

  // Also sync the execs.lua path
  const execsLuaFilePath = path.join(os.homedir(), '.config/hypr/custom/execs.lua')
  if (fs.existsSync(execsLuaFilePath)) {
    try {
      let content = fs.readFileSync(execsLuaFilePath, 'utf-8')
      const startMarker = '-- [nwg-react-displays] start'
      const endMarker = '-- [nwg-react-displays] end'

      if (content.includes(startMarker) && content.includes(endMarker)) {
        const lines = content.split('\n')
        const newLines: string[] = []
        let inSection = false

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed === startMarker) {
            inSection = true
            newLines.push(line)
            newLines.push(`    hl.exec_cmd("${currentPath} --apply")`)
            continue
          }
          if (trimmed === endMarker) {
            inSection = false
            newLines.push(line)
            continue
          }
          if (!inSection) {
            newLines.push(line)
          }
        }
        
        const newContent = newLines.join('\n')
        if (content !== newContent) {
          console.log('Syncing execs.lua path to current executable:', currentPath)
          fs.writeFileSync(execsLuaFilePath, newContent)
        }
      }
    } catch (err) {
      console.error('Failed to sync execs.lua path:', err)
    }
  }
}

function startHyprlandEventListener(): void {
  const signature = process.env.HYPRLAND_INSTANCE_SIGNATURE
  if (!signature) {
    console.log('HYPRLAND_INSTANCE_SIGNATURE not found. Not listening to Hyprland events.')
    return
  }

  const xdgRuntimeDir = process.env.XDG_RUNTIME_DIR
  let socketPath = `/tmp/hypr/${signature}/.socket2.sock`
  if (xdgRuntimeDir) {
    const xdgSocketPath = path.join(xdgRuntimeDir, 'hypr', signature, '.socket2.sock')
    if (fs.existsSync(xdgSocketPath)) {
      socketPath = xdgSocketPath
    }
  }

  let client: net.Socket | null = null

  const connect = (): void => {
    client = net.createConnection(socketPath)

    client.on('connect', () => {
      console.log('Connected to Hyprland event socket.')
    })

    client.on('data', (data) => {
      const messages = data.toString().split('\n')
      let shouldReload = false

      for (const msg of messages) {
        const trimmed = msg.trim()
        if (trimmed.startsWith('monitoradded>>') || trimmed.startsWith('monitorremoved>>')) {
          console.log(`Hyprland event detected: ${trimmed}`)
          shouldReload = true
        }
      }

      if (shouldReload) {
        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
          console.log('Notifying renderer to reload monitors...')
          mainWindow.webContents.send('hyprland_monitor_changed')
        }
      }
    })

    client.on('error', (err) => {
      console.error('Hyprland event socket error:', err)
    })

    client.on('close', () => {
      console.log('Hyprland event socket closed. Reconnecting in 3 seconds...')
      if (client) {
        client.destroy()
        client = null
      }
      setTimeout(connect, 3000)
    })
  }

  connect()

  // Clean up socket on app quit
  app.on('will-quit', () => {
    if (client) {
      client.destroy()
    }
  })
}

const isSingleInstance = app.requestSingleInstanceLock()

if (!isSingleInstance) {
  app.quit()
} else {
  app.on('second-instance', (_, commandLine) => {
    if (commandLine.includes('--apply')) {
      console.log('Second instance was an --apply command. Ignoring UI popup and applying config.')
      syncAndApplyHyprlandConfig()
      return
    }

    if (commandLine.includes('--hidden')) {
      console.log('Second instance was started hidden. Ignoring UI popup.')
      return
    }

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    // Cek apakah aplikasi dipanggil dengan argumen --apply (Headless CLI mode)
    if (process.argv.includes('--apply')) {
      console.log('Running in CLI mode: Applying configs...')
      syncAndApplyHyprlandConfig().then(() => {
        app.quit()
      })
      return // Hentikan eksekusi agar GUI tidak terbuka
    }

    // app.setAppUserModelId('hyprdisplay')
    
    // Daftarkan ke menu aplikasi sistem (Matikan jika tidak ingin double dengan AppImageLauncher)
    // registerDesktopEntry()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  createTray()
  syncAutostartPath()
  startHyprlandEventListener()
  initializeUpdater()

  // Auto-check for updates shortly after startup (only in production)
  setTimeout(() => {
    if (!is.dev) {
      autoUpdater.checkForUpdatesAndNotify().catch(err => {
        console.error('Failed check on startup:', err)
      })
    }
  }, 5000)

  // Auto-trigger identifier and reload configs after startup (delay for better reliability)
  setTimeout(() => {
    console.log('Performing startup monitor sync...')
    syncAndApplyHyprlandConfig(true)
  }, 2000)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    const settingsPath = path.join(os.homedir(), '.config/nwg-react-displays/settings.json')
    let runInBg = true
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
        runInBg = settings.run_in_background !== undefined ? settings.run_in_background : true
      } catch (e) { }
    }
    if (!runInBg) app.quit()
  }
})

// Cleanup tray and VNC streams on quit
app.on('will-quit', () => {
  activeWayVncProcesses.forEach((stream) => {
    try {
      stream.process.kill()
    } catch (e) {}
  })
  activeWayVncProcesses.clear()

  if (tray) {
    tray.destroy()
    tray = null
  }
})

// Handle manual termination signals for better cleanup during development
process.on('SIGINT', () => {
  app.quit()
})
process.on('SIGTERM', () => {
  app.quit()
})
}
