import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  extractPdfText: (filePath: string): Promise<string> => 
    ipcRenderer.invoke('extract-pdf-text', filePath),
    
  openFilePicker: (): Promise<string | null> => 
    ipcRenderer.invoke('open-file-picker'),

  downloadModel: (url: string, filename: string) => ipcRenderer.invoke('download-model', url, filename),

  onDownloadProgress: (callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('download-progress', subscription);
    
    return () => ipcRenderer.removeListener('download-progress', subscription);
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
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