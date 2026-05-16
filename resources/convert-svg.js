const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

app.whenReady().then(() => {
  const win = new BrowserWindow({
    show: false,
    width: 1024,
    height: 1024,
    transparent: true,
    frame: false,
    webPreferences: {
      offscreen: true
    }
  })

  const svgPath = path.join(__dirname, 'icon.svg')
  const pngPath = path.join(__dirname, 'icon.png')

  console.log(`Loading SVG from: ${svgPath}`)

  win.loadFile(svgPath)

  win.webContents.on('did-finish-load', () => {
    // Add a small delay to ensure rendering is complete
    setTimeout(() => {
      win
        .capturePage()
        .then((image) => {
          const buffer = image.toPNG()
          fs.writeFileSync(pngPath, buffer)
          console.log(`Saved PNG to: ${pngPath}`)
          app.quit()
        })
        .catch((err) => {
          console.error('Failed to capture page:', err)
          app.exit(1)
        })
    }, 500)
  })
})
