import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { optimizer, is } from '@electron-toolkit/utils'
import iconAsset from '../../resources/icon.png?asset'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

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

ipcMain.handle('apply_hyprland_config', async (_, args: { config: string }) => {
  const filePath = path.join(os.homedir(), '.config/hypr/monitors.conf')
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, args.config)
  spawn('hyprctl', ['reload'])
  return
})

ipcMain.handle('apply_workspace_config', async (_, args: { config: string }) => {
  const filePath = path.join(os.homedir(), '.config/hypr/workspaces.conf')
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, args.config)
  return
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

async function identifyMonitors(targetMonitorName?: string): Promise<void> {
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

    pyProcess.stdout.on('data', (data) => console.log(`Python Output [${m.name}]: ${data}`));
    pyProcess.stderr.on('data', (data) => console.error(`Python Error [${m.name}]: ${data}`));
    
    pyProcess.on('error', (err) => {
      console.error(`Failed to start Python process for ${m.name}:`, err);
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
      const desktopContent = `[Desktop Entry]
Name=hyprdisplay
Comment=Hyprland Monitor Manager
Exec=${executablePath}
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

ipcMain.handle('get_autostart', async () => {
  if (process.platform !== 'linux') return false
  const desktopFilePath = path.join(os.homedir(), '.config/autostart/hyprdisplay.desktop')
  return fs.existsSync(desktopFilePath)
})

function registerDesktopEntry(): void {
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

const isSingleInstance = app.requestSingleInstanceLock()

if (!isSingleInstance) {
  app.quit()
} else {
  app.on('second-instance', () => {
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
      spawn('hyprctl', ['reload'])
      app.quit()
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

  // Auto-trigger identifier saat startup (delay 1.5 detik agar lebih smooth)
  setTimeout(() => {
    identifyMonitors()
  }, 1500)

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

// Cleanup tray on quit
app.on('will-quit', () => {
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
