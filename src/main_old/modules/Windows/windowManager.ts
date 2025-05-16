import { BaseWindow } from './AppBaseWindows'
import { createWebView } from '../WebView'
import { handleIpc } from '../ipcManager'
import { attachContextMenu, handleExternalLinks } from '../WebView/webcontentManager'
import { ipcMain, IpcMainEvent } from 'electron'
import Store from 'electron-store'

const store = new Store()

export class WindowManager {
  private static instance: WindowManager
  public win: BaseWindow
  public views: any[] = []

  private constructor() {
    this.win = new BaseWindow({ width: 800, height: 400 })

    this.loadSavedTabs()

    const topBar = createWebView('http://localhost:5173/', 0, 0, 800, 55)
    topBar['id'] = 'top-bar'
    this.views.push(topBar)
    this.win.contentView.addChildView(topBar)

    handleIpc(topBar, this.win)
    attachContextMenu(topBar.webContents)

    this.win.on('resize', () => this.resizeViews())

    // topBar.webContents.openDevTools()

    ipcMain.on('open-new-window', (event: IpcMainEvent, url: string, tabId: string) => {
      this.openNewWindow(url, tabId)
    })

    ipcMain.on('activate-tab', (event: IpcMainEvent, tabId: string) => {
      this.activateTab(tabId)
    })
  }

  private resizeViews() {
    const [width, height] = this.win.getSize()
    const topBar = this.views.find((v) => v['id'] === 'top-bar')
    if (topBar) topBar.setBounds({ x: 0, y: 0, width, height: 55 })

    const activeTab = this.getActiveTabView()
    if (activeTab) activeTab.setBounds({ x: 0, y: 55, width: width - 15, height: height - 120 })
  }

  private getActiveTabView(): any {
    return this.views.find((v) => v['id']?.startsWith('tab-') && v.getBounds().width > 0)
  }

  private activateTab(tabId: string): void {
    this.views.forEach((v) => {
      if (v['id']?.startsWith('tab-')) {
        v.setBounds({ x: 0, y: 0, width: 0, height: 0 })
      }
    })

    const targetView = this.views.find((v) => v['id'] === `tab-${tabId}`)
    if (targetView) {
      const [width, height] = this.win.getSize()
      targetView.setBounds({ x: 0, y: 55, width: width - 15, height: height - 120 })
    }

    const savedTabs = store.get('tabs', [])
    const tab = savedTabs.find((t: any) => t.tabId === tabId)
    if (tab) store.set('activeTab', tabId)
  }

  private loadSavedTabs(): void {
    const savedTabs = store.get('tabs', [])
    const [width, height] = this.win.getSize()

    savedTabs.forEach((tab: any) => {
      const view = createWebView(tab.url, 0, 55, width - 15, height - 120)
      view['id'] = `tab-${tab.tabId}`
      this.views.push(view)
      this.win.contentView.addChildView(view)

      handleIpc(view, this.win)
      attachContextMenu(view.webContents)
      handleExternalLinks(view.webContents)
    })

    const activeTabId = store.get('activeTab') || (savedTabs[0]?.tabId ?? null)
    if (activeTabId) this.activateTab(activeTabId)
  }

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager()
    }
    return WindowManager.instance
  }

  private openNewWindow(url: string, tabId: string): void {
    let finalUrl = url

    if (url.startsWith('/storedTab')) {
      const savedTabs = store.get('tabs', [])

      const queryString = url.split('?')[1]
      const idsParam = new URLSearchParams(queryString).get('ids')

      if (idsParam) {
        const ids = idsParam.split(',')
        const savedTabs = store.get('tabs', [])
        const matchingTabs = savedTabs.filter((tab: any) => ids.includes(tab.tabId))

        store.set('tabs', matchingTabs)

        if (matchingTabs.length > 0) {
          const [width, height] = this.win.getSize()

          this.views.forEach((v) => {
            if (v['id']?.startsWith('tab-')) {
              v.setBounds({ x: 0, y: 0, width: 0, height: 0 })
            }
          })

          matchingTabs.forEach((tab: any, index: number) => {
            const viewId = `tab-${tab.tabId}`
            const existingView = this.views.find((v) => v['id'] === viewId)

            let view
            if (existingView) {
              view = existingView
            } else {
              view = createWebView(tab.url || 'about:blank', 0, 55, width - 15, height - 120)
              view['id'] = viewId
              this.views.push(view)
              this.win.contentView.addChildView(view)

              handleIpc(view, this.win)
              attachContextMenu(view.webContents)
              handleExternalLinks(view.webContents)
            }

            if (index === 0) {
              view.setBounds({ x: 0, y: 55, width: width - 15, height: height - 120 })
              store.set('activeTab', tab.tabId)
            } else {
              view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
            }
          })
        } else {
          console.warn('No matching tabs found for the provided ids:', ids)
        }
      } else {
        const savedTab = savedTabs.find((t: any) => t.tabId === tabId)
        if (savedTab) {
          finalUrl = savedTab.url
        } else {
          console.warn(`No stored URL found for tabId: ${tabId}`)
          return
        }
      }
    } else if (url.startsWith('/')) {
      finalUrl = `http://localhost:5173${url}`
    }

    this.views.forEach((v) => {
      if (v['id']?.startsWith('tab-')) {
        v.setBounds({ x: 0, y: 0, width: 0, height: 0 })
      }
    })

    const [width, height] = this.win.getSize()
    const existingView = this.views.find((v) => v['id'] === `tab-${tabId}`)

    if (existingView) {
      existingView.webContents.loadURL(finalUrl)
      existingView.setBounds({ x: 0, y: 55, width: width - 15, height: height - 120 })
    } else {
      const view = createWebView(finalUrl, 0, 55, width - 15, height - 120)
      view['id'] = `tab-${tabId}`
      this.views.push(view)
      this.win.contentView.addChildView(view)

      handleIpc(view, this.win)
      attachContextMenu(view.webContents)
      handleExternalLinks(view.webContents)
    }

    const savedTabs = store.get('tabs', [])
    const index = savedTabs.findIndex((t: any) => t.tabId === tabId)

    if (!url.startsWith('/storedTab')) {
      if (index >= 0) {
        savedTabs[index].url = finalUrl
      } else {
        savedTabs.push({ tabId, url: finalUrl })
      }

      store.set('tabs', savedTabs)
    }
    store.set('activeTab', tabId)
  }
}
