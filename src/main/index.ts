import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as fs from 'fs'
import { PDFParse } from 'pdf-parse'
import path from 'path'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.handle('extract-pdf-text', async (_event, filePath: string) => {
  const dataBuffer = fs.readFileSync(filePath)

  const parser = new PDFParse({ data: dataBuffer })
  const result = await parser.getText()

  await parser.destroy()

  return result.text
})


ipcMain.handle('open-file-picker', async () => {
  // Pass the active window so the picker modal attaches correctly
  const window = BrowserWindow.getFocusedWindow()

  const result = await dialog.showOpenDialog(window!, {
    properties: ['openFile'],
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  // Returns the file path string if chosen, or null if canceled
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('download-model', async (event, url, filename) => {
  const userDataPath = app.getPath('userData');
  const filePath = path.join(userDataPath, filename);
  const fileStream = fs.createWriteStream(filePath);

  try {
    const response = await fetch(url);
    const totalSize = parseInt(response.headers.get('content-length') || '0', 10);

    let downloaded = 0;

    if (!response.body) return;

    let lastPercentage = 0;
    for await (const chunk of response.body) {
      fileStream.write(chunk);
      downloaded += chunk.length;

      const percentage = Math.min(Math.floor((downloaded / totalSize) * 100), 100);

      if (percentage > lastPercentage) {
        lastPercentage = percentage;
        event.sender.send('download-progress', {
          downloaded,
          total: totalSize,
          percentage
        });
      }
    }

    fileStream.end();
    return filePath;

  } catch (error) {
    fs.unlinkSync(filePath); // Delete the partially downloaded file
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Download failed: ${message}`);
  } finally {
    fileStream.close();
  }
});

let llamaEngine: any = null;
let aiModel: any = null;
let aiContext: any = null;

ipcMain.handle('ask-ai', async (event, filename: string, prompt: string) => {
  const userDataPath = app.getPath('userData');
  const modelPath = path.join(userDataPath, filename);

  if (!fs.existsSync(modelPath)) {
    throw new Error("Model file not found! Download it first.");
  }

  const { getLlama, LlamaChatSession } = await import('node-llama-cpp');

  if (!llamaEngine) {
    console.log("Loading model into memory... this takes a few seconds.");
    llamaEngine = await getLlama();
    aiModel = await llamaEngine.loadModel({ modelPath });
    aiContext = await aiModel.createContext();
  }

  const session = new LlamaChatSession({
    contextSequence: aiContext.getSequence()
  });

  const fullResponse = await session.prompt(prompt, {
    onTextChunk(chunk: string) {
      event.sender.send('ai-stream-chunk', chunk);
    }
  });

  return fullResponse;
});