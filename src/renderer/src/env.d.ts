/// <reference types="vite/client" />

import type { ConvertStatus } from '../../preload'

declare global {
  interface Window {
    api: {
      getOutputFolder: () => Promise<string>
      setOutputFolder: () => Promise<string | null>
      openOutputFolder: () => Promise<void>
      checkFfmpeg: () => Promise<boolean>
      convertFiles: (paths: string[]) => Promise<void>
      onConvertStatus: (cb: (data: ConvertStatus) => void) => () => void
      minimize: () => void
      close: () => void
    }
  }
}
