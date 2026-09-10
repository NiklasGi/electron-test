import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 1. Bundle all your custom functions into one object here
const api = {
  extractPdfText: (filePath: string): Promise<string> => 
    ipcRenderer.invoke('extract-pdf-text', filePath),
    
  openFilePicker: (): Promise<string | null> => 
    ipcRenderer.invoke('open-file-picker')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    // 2. Expose the consolidated object ONCE
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}