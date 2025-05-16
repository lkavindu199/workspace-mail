import { ElectronAPI } from '@electron-toolkit/preload'

export {}

declare global {
  interface Window {
    openNewWindow?: (url: string) => void
    electron?: {
      openNewWindow: (url: string) => void
      onDrop: (callback: (data: { filePath: string; fileName: string }) => void) => void
      sendDropData: (data: { filePath: string; fileName: string }) => void
    }
    api: unknown
    ElectronAPI: {
      getStoreValue: (key: string) => Promise<any>
      setStoreValue: (key: string, value: any) => Promise<void>
    }
  }
}
