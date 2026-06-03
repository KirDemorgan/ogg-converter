import { contextBridge, ipcRenderer } from 'electron'

export interface ConvertStatus {
  filePath: string
  status: 'processing' | 'done' | 'error'
  outputPath?: string
  error?: string
}

contextBridge.exposeInMainWorld('api', {
  getOutputFolder: (): Promise<string> =>
    ipcRenderer.invoke('get-output-folder'),

  setOutputFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('set-output-folder'),

  openOutputFolder: (): Promise<void> =>
    ipcRenderer.invoke('open-output-folder'),

  checkFfmpeg: (): Promise<boolean> =>
    ipcRenderer.invoke('check-ffmpeg'),

  convertFiles: (paths: string[]): Promise<void> =>
    ipcRenderer.invoke('convert-files', paths),

  onConvertStatus: (cb: (data: ConvertStatus) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: ConvertStatus) => cb(data)
    ipcRenderer.on('convert-status', handler)
    return () => ipcRenderer.removeListener('convert-status', handler)
  },

  minimize: (): void => ipcRenderer.send('window-minimize'),
  close: (): void => ipcRenderer.send('window-close')
})
