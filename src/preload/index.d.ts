import { ElectronAPI } from '@electron-toolkit/preload'
import { Tab } from '../renderer/src/App'

declare global {
  interface Window {
    electron: ElectronAPI & {
      getTabs: () => Promise<Tab[]>
      getStoreValue: <T = unknown>(key: string) => Promise<T>
      setStoreValue: (
        key: string,
        value: string | number | boolean | object | null
      ) => Promise<void>
      openNewWindow: (url: string, id: string) => void
      saveTabs: (tabs: Tab[]) => Promise<void>
      activateTab: (id: string) => void
    }
    api: unknown
  }
}
