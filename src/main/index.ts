import { app, BrowserWindow, ipcMain, dialog, shell, Notification, nativeImage } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { convertFile } from './converter'

const CONFIG_PATH = join(app.getPath('userData'), 'config.json')

interface Config {
  outputFolder: string
}

function loadConfig(): Config {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
  } catch {
    return { outputFolder: join(homedir(), 'Downloads', 'converted') }
  }
}

function saveConfig(config: Config): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

let mainWindow: BrowserWindow | null = null
let config = loadConfig()

function createWindow(): void {
  const isMac = process.platform === 'darwin'
  const isWin = process.platform === 'win32'

  mainWindow = new BrowserWindow({
    width: 520,
    height: 620,
    minWidth: 400,
    minHeight: 500,
    frame: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: { x: 16, y: 14 },
    backgroundColor: '#0a0a0a',
    // TODO: macOS tray integration — show drop target in menu bar
    ...(isWin && {
      backgroundMaterial: 'acrylic'
    }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('get-output-folder', () => config.outputFolder)

ipcMain.handle('set-output-folder', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: config.outputFolder
  })
  if (!result.canceled && result.filePaths[0]) {
    config.outputFolder = result.filePaths[0]
    saveConfig(config)
    return config.outputFolder
  }
  return null
})

ipcMain.handle('open-output-folder', () => {
  if (!existsSync(config.outputFolder)) {
    mkdirSync(config.outputFolder, { recursive: true })
  }
  return shell.openPath(config.outputFolder)
})

ipcMain.handle('check-ffmpeg', async () => {
  const { execSync } = await import('child_process')
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})

ipcMain.handle('convert-files', async (event, filePaths: string[]) => {
  if (!existsSync(config.outputFolder)) {
    mkdirSync(config.outputFolder, { recursive: true })
  }

  for (const filePath of filePaths) {
    const baseName = filePath.split(/[\\/]/).pop()!.replace(/\.[^/.]+$/, '')
    const outputPath = join(config.outputFolder, `${baseName}.mp3`)

    event.sender.send('convert-status', { filePath, status: 'processing' })

    try {
      await convertFile(filePath, outputPath)
      event.sender.send('convert-status', { filePath, status: 'done', outputPath })

      if (Notification.isSupported()) {
        new Notification({
          title: 'Done',
          body: `${baseName}.mp3`
        }).show()
      }
    } catch (err) {
      event.sender.send('convert-status', {
        filePath,
        status: 'error',
        error: (err as Error).message
      })
    }
  }
})

ipcMain.on('start-drag', (event, filePath: string) => {
  event.sender.startDrag({
    file: filePath,
    icon: nativeImage.createEmpty()
  })
})

ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-close', () => mainWindow?.close())
