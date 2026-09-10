export const IpcEvents = {
  DOWNLOAD_PROGRESS: 'download-progress',
  AI_STREAM_CHUNK: 'ai-stream-chunk',
  UNLOAD_MODEL: 'unload-model',
  EXTRACT_PDF: 'extract-pdf-text',
  OPEN_FILE_PICKER: 'open-file-picker',
  DOWNLOAD_MODEL: 'download-model'
} as const;

export type IpcEvent = typeof IpcEvents[keyof typeof IpcEvents];