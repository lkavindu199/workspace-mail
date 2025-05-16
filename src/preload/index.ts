import { contextBridge, ipcRenderer } from 'electron'

declare global {
  interface Window {
    electron?: {
      openNewWindow: (url: string, tabId: string) => void
      onDrop: (callback: (data: { filePath: string; fileName: string }) => void) => void
      sendDropData: (data: { filePath: string; fileName: string }) => void
      activateTab: (tabId: string) => void
      getTabs: () => Promise<any[]>
      saveTabs: (tabs: any[]) => void
    }
  }
}

contextBridge.exposeInMainWorld('electron', {
  openNewWindow: (url: string | URL, tabId: string) =>
    ipcRenderer.send('open-new-window', url.toString(), tabId),
  activateTab: (tabId: string) => ipcRenderer.send('activate-tab', tabId),
  onDrop: (callback: (data: { filePath: string; fileName: string }) => void) =>
    ipcRenderer.on('file-drop', (_, data) => callback(data)),
  sendDropData: (data: { filePath: string; fileName: string }) =>
    ipcRenderer.send('dropped-data', data),
  openServicePicker: () => ipcRenderer.send('open-service-picker'),
  onServicePicked: (callback: (data: { serviceId: string; serviceName: string }) => void) =>
    ipcRenderer.on('service-picked', (_event, data) => callback(data)),
  getStoreValue: (key: string) => ipcRenderer.invoke('store-get', key),
  setStoreValue: <T>(key: string, value: T) => ipcRenderer.invoke('store-set', key, value),
  browseStorageLocation: () => ipcRenderer.invoke('browse-storage-location'),
  clearStore: () => ipcRenderer.invoke('clear-store'),
  restartApp: () => ipcRenderer.send('restart-app'),
  getTabs: () => ipcRenderer.invoke('get-tabs'),
  saveTabs: (tabs: { id: string; title: string; url: string }[]) =>
    ipcRenderer.invoke('save-tabs', tabs),
  getActiveTabId: () => ipcRenderer.invoke('store-get', 'activeTabId'),
  encrypt: (text: string) => ipcRenderer.invoke('encrypt', text),
  decrypt: (text: string) => ipcRenderer.invoke('decrypt', text),
  ipcRenderer: {
    send: (channel: string, data: unknown) => {
      ipcRenderer.send(channel, data)
    },
    on: (channel: string, func: (...args: unknown[]) => void) => {
      ipcRenderer.on(channel, (_event, ...args) => func(...args))
    },
    removeListener: (channel: string, func: (...args: unknown[]) => void) => {
      ipcRenderer.removeListener(channel, func)
    }
  }
})

window.open = (url: string | URL | undefined) => {
  if (!url) {
    console.error('[preload] Invalid URL passed to window.open:', url)
    return null
  }
  console.log('[preload] window.open override hit:', url)
  const tabId = Math.random().toString(36).substring(2, 15)
  window.electron?.openNewWindow?.(url.toString(), tabId)
  return null
}

