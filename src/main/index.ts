import {
  app,
  BrowserWindow,
  shell,
  Menu,
  MenuItem,
  // session,
  WebContentsView,
  WebContents,
  ContextMenuParams,
  ipcMain,
  dialog
} from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import { exec } from 'child_process'
import * as path from 'path'
import { readFile } from 'fs'
import * as fs from 'fs'
import Store from 'electron-store'
import crypto from 'crypto'
import dotenv from 'dotenv'

dotenv.config()


  let isUpdateDownloaded = false;

const store = new Store()

const algorithm = 'aes-256-cbc'
const secretKey = crypto
  .createHash('sha256')
  .update(process.env.SECRET_KEY || 'kavindu')
  .digest()

function decryptPassword(encrypted: string): string {
  try {
    // Basic input validation
    if (
      !encrypted ||
      typeof encrypted !== 'string' ||
      encrypted.trim() === '' ||
      encrypted === 'undefined' ||
      encrypted === 'null'
    ) {
      console.warn('Empty or invalid input to decryptPassword')
      return ''
    }

    // Expecting format: <ivHex>:<encryptedText>
    const parts = encrypted.split(':')
    if (parts.length !== 2) {
      console.error('Invalid encrypted format - missing or too many IV separators')
      return ''
    }

    const [ivHex, encryptedText] = parts

    // Validate IV format and length (128 bits = 16 bytes = 32 hex chars)
    if (!/^[0-9a-fA-F]{32}$/.test(ivHex)) {
      console.error('Invalid IV format or length')
      return ''
    }

    if (!encryptedText || encryptedText.trim() === '') {
      console.error('Missing encrypted text')
      return ''
    }

    const iv = Buffer.from(ivHex, 'hex')
    if (iv.length !== 16) {
      console.error('IV buffer length is not 16 bytes')
      return ''
    }

    // Proceed with decryption
    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('Decryption failed:', error)
    return ''
  }
}

function createAppMenu(
  createAboutWindow: () => void,
  createSettingsWindow: () => void,
  getStorageLocation: () => string
): void {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'About Workspace Mail', click: createAboutWindow },
        { label: 'Settings', click: createSettingsWindow },
        {
          label: 'Attachments',
          click: () => {
            const location = getStorageLocation();
            shell.openPath(location).then((result) => {
              if (result) console.error('Failed to open folder:', result);
            });
          }
        },
        { type: 'separator' },
       {
  label: 'Check for Updates',
  click: () => {
    autoUpdater.checkForUpdates().catch(err => {
      console.error('Manual update check failed:', err);
      const mainWindow = WindowManager.getInstance().win;
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update Error',
        message: 'Failed to check for updates: ' + err.message,
        buttons: ['OK'],
      });
    });
  }
}

,
        {
          label: 'Enable Auto-Update',
          type: 'checkbox',
          checked: store.get('autoUpdate', true) as boolean,
          click: (menuItem) => {
            const enabled = menuItem.checked;
            store.set('autoUpdate', enabled);
            dialog.showMessageBox({
              type: 'info',
              title: 'Auto-Update Preference',
              message: `Auto-update has been ${enabled ? 'enabled' : 'disabled'}.\nRestart the app to apply changes.`,
              buttons: ['OK']
            });
          }
        },
        { type: 'separator' },
        { role: isMac ? 'close' : 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Office',
      click: () => {
        exec('"C:\\Program Files\\ONLYOFFICE\\DesktopEditors\\DesktopEditors.exe"', (err) => {
          if (err) console.error('OnlyOffice failed to launch:', err)
        })
      }
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Support',
          click: () => {
            shell.openExternal('https://support.squareworkspace.com')
          }
        }
      ]
    }
  ];

  // Add Restart to Update option if update was downloaded
  if (isUpdateDownloaded) {
    const fileSubmenu = template[0].submenu as Electron.MenuItemConstructorOptions[];
    fileSubmenu.splice(
      fileSubmenu.length - 2,
      0,
      {
        label: 'Restart to Update',
        click: () => autoUpdater.quitAndInstall()
      }
    );
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// WebView Management
function createWebView(
  rendererUrl: string,
  x: number,
  y: number,
  width: number,
  height: number
): WebContentsView {
  const preloadPath = path.join(__dirname, '../preload/index.js')

  console.log('Creating WebView with URL:', rendererUrl)
  if (rendererUrl == 'modal') {
    rendererUrl = getRendererUrl('modal')
  }
  const view = new WebContentsView({
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
      partition: `persist:tab-${crypto.randomUUID()}`
    }
  })

  view.webContents.loadURL(rendererUrl)
  view.setBounds({ x, y, width, height })
  attachContextMenu(view.webContents)
  handleIpc(view)
  // view.webContents.openDevTools({ mode: 'detach' })
  return view
}

// Context Menu and WebContents Management
function createContextMenu(webContents: WebContents, params: ContextMenuParams): Menu {
  const menu = new Menu()

  if (params.misspelledWord) {
    if (params.dictionarySuggestions.length > 0) {
      for (const suggestion of params.dictionarySuggestions) {
        menu.append(
          new MenuItem({
            label: suggestion,
            click: () => webContents.replaceMisspelling(suggestion)
          })
        )
      }
    } else {
      menu.append(
        new MenuItem({
          label: 'No suggestions',
          enabled: false
        })
      )
    }
    menu.append(new MenuItem({ type: 'separator' }))
  }

  menu.append(new MenuItem({ role: 'cut', label: 'Cut' }))
  menu.append(new MenuItem({ role: 'copy', label: 'Copy' }))
  menu.append(new MenuItem({ role: 'paste', label: 'Paste' }))
  menu.append(new MenuItem({ type: 'separator' }))
  menu.append(new MenuItem({ role: 'selectAll', label: 'Select All' }))

  menu.append(new MenuItem({ type: 'separator' }))
  menu.append(
    new MenuItem({
      label: 'Open DevTools',
      click: () => webContents.openDevTools({ mode: 'detach' })
    })
  )

  return menu
}

function attachContextMenu(webContents: WebContents): void {
  webContents.on('context-menu', (_event, params) => {
    const menu = createContextMenu(webContents, params)
    menu.popup({
      window: BrowserWindow.fromWebContents(webContents) ?? undefined,
      x: params.x,
      y: params.y
    })
  })

  try {
    webContents.session.setSpellCheckerLanguages(['en-US', 'en-GB'])
    webContents.session.setSpellCheckerEnabled(true)
  } catch (err) {
    console.error('Spellchecker error:', err)
  }
}

function isInternalURL(url: string): boolean {
  try {
    const parsed = new URL(url)
    const isInternal =
      parsed.hostname === 'squareworkspace.com' || parsed.hostname.endsWith('.squareworkspace.com')
    return isInternal
  } catch (error) {
    console.error('Failed to parse URL:', url, error)
    return false
  }
}

function handleExternalLinks(webContents: WebContents): void {
  webContents.on('will-navigate', (event, url) => {
    if (!isInternalURL(url)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  webContents.setWindowOpenHandler(({ url }) => {
    if (!isInternalURL(url)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })
}

// Window Management
class BaseWindow extends BrowserWindow {
  constructor(options: Electron.BrowserWindowConstructorOptions) {
    super(options)
  }
}

class WindowManager {
  private static instance: WindowManager
  public win: BaseWindow
  public views: WebContentsView[] = []

  private constructor() {
    this.win = new BaseWindow({
      width: 1024,
      height: 768,
      title: 'Workspace Mail',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        partition: `persist:tab-${crypto.randomUUID()}`
      }
    })
    this.loadSavedTabs()

    const [width] = this.win.getSize()
    const topBar = createWebView(getRendererUrl('tabs'), 0, 0, width, 55)

    topBar['id'] = 'top-bar'
    this.views.push(topBar)
    this.win.contentView.addChildView(topBar)

    handleIpc(topBar)
    attachContextMenu(topBar.webContents)

    this.setupDownloads()

    this.win.on('resize', () => this.resizeViews())

    ipcMain.on('open-new-window', (_: Electron.IpcMainEvent, url: string, id: string) => {
      this.openNewWindow(url, id)
    })

    ipcMain.on('activate-tab', (_: Electron.IpcMainEvent, id: string) => {
      this.activateTab(id)
    })

    ipcMain.on('refresh-all', () => {
      this.refreshAll()
    })
  }

  private refreshAll(): void {
    if (this.win?.webContents && !this.win.webContents.isDestroyed()) {
      this.win.webContents.reload()
    }

    this.views.forEach((view) => {
      if (view.webContents && !view.webContents.isDestroyed()) {
        view.webContents.reload()
      }
    })
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.reload()
    }

    this.loadSavedTabs()
  }

  private resizeViews(): void {
    const [width, height] = this.win.getSize()
    const topBar = this.views.find((v) => v['id'] === 'top-bar')
    if (topBar) topBar.setBounds({ x: 0, y: 0, width, height: 55 })

    const activeTab = this.getActiveTabView()
    if (activeTab) activeTab.setBounds({ x: 0, y: 55, width: width - 15, height: height - 120 })
  }

  private getActiveTabView(): WebContentsView | undefined {
    return this.views.find((v) => v['id']?.startsWith('tab-') && v.getBounds().width > 0)
  }

  private activateTab(id: string): void {
    this.views.forEach((v) => {
      if (v['id']?.startsWith('tab-')) {
        v.setBounds({ x: 0, y: 0, width: 0, height: 0 })
      }
    })

    const targetView = this.views.find((v) => v['id'] === `tab-${id}`)
    if (targetView) {
      const [width, height] = this.win.getSize()
      targetView.setBounds({ x: 0, y: 55, width: width - 15, height: height - 120 })
    }

    const savedTabs = store.get('tabs', []) as { id: string; url?: string }[]
    interface Tab {
      id: string
      url?: string
      username?: string
      password?: string
    }

    const tab = (savedTabs as Tab[]).find((t: Tab) => t.id === id)
    if (tab) store.set('activeTab', id)
  }

  private async loadSavedTabs(): Promise<void> {
    interface Tab {
      id: string
      url?: string
      username?: string
      password?: string
    }
    const savedTabs = store.get('tabs', []) as Tab[]
    const [width, height] = this.win.getSize()
    const updatedTabs: Tab[] = []

    for (const tab of savedTabs) {
      const viewIndex = this.views.findIndex((v) => v['id'] === `tab-${tab.id}`)
      if (viewIndex !== -1) {
        const view = this.views[viewIndex]
        view.webContents.close()
        this.win.contentView.removeChildView(view)
        this.views.splice(viewIndex, 1)
        console.log('Closed tab:', tab.id)
      }
    }

    await Promise.all(
      savedTabs.map(async (tab) => {
        try {
          let urlToLoad = tab.url
          const updatedTab = { ...tab }

          if (
            urlToLoad &&
            urlToLoad.includes('squareworkspace.com') &&
            tab.username &&
            tab.password
          ) {
            const authenticatedUrl = await this.authenticateAccount(tab.username, tab.password)
            if (authenticatedUrl) {
              urlToLoad = authenticatedUrl
              updatedTab.url = authenticatedUrl
            } else {
              console.warn(`Authentication failed for tab ID: ${tab.id}, using saved URL.`)
            }
          }

          updatedTabs.push(updatedTab)
        } catch (error) {
          console.error(`Error loading tab ID ${tab.id}:`, error)
          updatedTabs.push(tab)
        }
      })
    )

    store.set('tabs', updatedTabs)
    // console.log('Updated saved tabs:', updatedTabs)

    updatedTabs.forEach((tab) => {
      console.log('Loading tab:', tab)
      const view = createWebView(tab.url || 'about:blank', 0, 55, width - 15, height - 120)
      view['id'] = `tab-${tab.id}`
      this.views.push(view)
      this.win.contentView.addChildView(view)

      handleIpc(view)
      attachContextMenu(view.webContents)
      handleExternalLinks(view.webContents)

      // view.webContents.openDevTools({ mode: 'detach' })
    })

    const activeId = (store.get('activeTab') as string | null) || updatedTabs[0]?.id || null
    console.log('Active tab ID:', activeId)

    if (typeof activeId === 'string') {
      this.activateTab(activeId)
    } else {
      console.warn('No valid active tab ID found.')
    }
  }

  private async authenticateAccount(
    email: string,
    encryptedPassword: string
  ): Promise<string | null> {
    const loginUrl = 'https://mail.squareworkspace.com/api/v1/auth/authenticate-user'

    let password: string
    try {
      password = decryptPassword(encryptedPassword)
    } catch (error) {
      console.error('Failed to decrypt password:', error)
      return null
    }

    const loginData = {
      username: email,
      password: password,
      teamWorkspace: false,
      retrieveAutoLoginToken: true
    }

    try {
      console.log('Authenticating:', email)

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      })

      const result = await response.json()

      if (!response.ok) {
        console.error(`Authentication failed (HTTP ${response.status}):`, result.message)
        return null
      }

      if (result.autoLoginUrl) {
        return result.autoLoginUrl
      } else {
        console.error('Authentication successful but no autoLoginUrl received.')
        return null
      }
    } catch (error) {
      console.error('Error during authentication:', error)
      return null
    }
  }

  private setupDownloads(): void {
    // Track all sessions to avoid duplicate listeners
    const handledSessions = new Set<Electron.Session>()

    // Function to handle downloads for a given session
    const handleSessionDownloads = (session: Electron.Session): void => {
      if (handledSessions.has(session)) return
      handledSessions.add(session)

      session.on('will-download', (_, item) => {
        const storageLocation = store.get('storageLocation', app.getPath('downloads')) as string
        const savePath = path.join(storageLocation, item.getFilename())

        console.log(`Downloading ${item.getFilename()} to ${savePath}`)
        item.setSavePath(savePath)

        item.on('done', async (_, state) => {
          if (state === 'completed') {
            const fileReady = (): boolean => {
              try {
                const stats = fs.statSync(savePath)
                return stats.size > 0
              } catch {
                return false
              }
            }

            // Wait until file is fully ready (or timeout after 2 seconds)
            let attempts = 0
            while (!fileReady() && attempts < 20) {
              await new Promise((res) => setTimeout(res, 100)) // wait 100ms
              attempts++
            }

            if (fileReady()) {
              try {
                const result = await shell.openPath(savePath)
                if (result) {
                  console.error(`Failed to open file: ${result}`)
                } else {
                  console.log(`Successfully opened: ${savePath}`)
                }
              } catch (err) {
                console.error('Error opening file:', err)
              }
            } else {
              console.error('File not ready after timeout, not opening.')
            }
          } else {
            console.warn(`Download not completed. State: ${state}`)
          }
        })
      })
    }

    // Handle main window's session
    handleSessionDownloads(this.win.webContents.session)

    // Handle existing views
    this.views.forEach((view) => {
      handleSessionDownloads(view.webContents.session)
    })

    // Future-proof: Listen for new views
    const originalAddView = this.win.contentView.addChildView.bind(this.win.contentView)
    this.win.contentView.addChildView = (view: WebContentsView) => {
      originalAddView(view)
      handleSessionDownloads(view.webContents.session)
    }
  }

  // private handleIpc(view: WebContentsView): void {
  //   const webContents = view.webContents

  //   ipcMain.on('dropped-data', (_event, data) => {
  //     if (!webContents || webContents.isDestroyed()) return

  //     if (data.type === 'text') {
  //       const url = data.text
  //       if (/^https?:\/\//.test(url)) {
  //         webContents.loadURL(url)
  //       } else {
  //         webContents.loadURL('data:text/plain;charset=utf-8,' + encodeURIComponent(url))
  //       }
  //     }

  //     if (data.type === 'files' && data.paths.length > 0) {
  //       const filePath = data.paths[0]
  //       const ext = path.extname(filePath).toLowerCase()

  //       if (ext === '.html' || ext === '.htm') {
  //         webContents.loadFile(filePath)
  //       } else if (ext === '.txt') {
  //         readFile(filePath, 'utf8', (err, content) => {
  //           if (err) {
  //             console.error('Error reading file:', err)
  //             return
  //           }
  //           const html = `
  //             <html>
  //               <head><meta charset="utf-8"><title>Dropped Text File</title></head>
  //               <body style="font-family: sans-serif; padding: 1rem; white-space: pre-wrap;">
  //                 ${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
  //               </body>
  //             </html>`
  //           webContents.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  //         })
  //       } else {
  //         webContents.loadURL(
  //           'data:text/plain;charset=utf-8,' + encodeURIComponent(`Unsupported file: ${filePath}`)
  //         )
  //       }
  //     }
  //   })
  // }

  private async openNewWindow(url: string, id: string): Promise<void> {
    let finalUrl = url

    if (url.startsWith('/storedTab')) {
      const savedTabs = store.get('tabs', [])
      const queryString = url.split('?')[1]
      const idsParam = new URLSearchParams(queryString).get('ids')

      if (idsParam) {
        const ids = idsParam.split(',')
        interface Tab {
          id: string
          url?: string
          username?: string
          password?: string
        }
        const accountsavedTabs = (savedTabs as Tab[]).filter((tab: Tab) => {
          return (
            tab.username != null &&
            tab.password != null &&
            tab.username.trim() !== '' &&
            tab.password.trim() !== ''
          )
        })

        const matchingTabs = (savedTabs as Tab[]).filter((tab: Tab) => ids.includes(tab.id))
        const combinedTabs = [...accountsavedTabs, ...matchingTabs]

        const uniqueTabs = combinedTabs.filter((tab, index, self) => {
          return index === self.findIndex((t) => t.id === tab.id)
        })

        for (const tab of uniqueTabs) {
          if (tab.url?.includes('squareworkspace.com') && tab.username && tab.password) {
            try {
              const authenticatedUrl = await this.authenticateAccount(tab.username, tab.password)
              if (authenticatedUrl) {
                tab.url = authenticatedUrl
              } else {
                console.warn(`Authentication failed for tab ID: ${tab.id}, using saved URL.`)
              }
            } catch (err) {
              console.error(`Auth error for tab ${tab.id}:`, err)
            }
          }
        }

        store.set('tabs', uniqueTabs)

        if (matchingTabs.length > 0) {
          const [width, height] = this.win.getSize()
          this.views.forEach((v) => {
            if (v['id']?.startsWith('tab-')) {
              v.setBounds({ x: 0, y: 0, width: 0, height: 0 })
            }
          })

          matchingTabs.forEach((tab: Tab, index: number) => {
            const viewId = `tab-${tab.id}`
            const existingView = this.views.find((v) => v['id'] === viewId)

            let view: WebContentsView
            if (existingView) {
              view = existingView
            } else {
              view = createWebView(tab.url || 'about:blank', 0, 55, width - 15, height - 120)
              view['id'] = viewId
              this.views.push(view)
              this.win.contentView.addChildView(view)
              handleIpc(view)
              attachContextMenu(view.webContents)
              handleExternalLinks(view.webContents)
            }

            if (index === 0) {
              view.setBounds({ x: 0, y: 55, width: width - 15, height: height - 120 })
              store.set('activeTab', tab.id)
            } else {
              view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
            }
          })
        }
      }
    } else if (url.startsWith('/settings')) {
      createSettingsWindow()
      return
    } else if (url.startsWith('/clear')) {
      const [width] = this.win.getSize()

      this.views.forEach((v) => {
        this.win.contentView.removeChildView(v)
        v.webContents.closeDevTools()
        v.webContents.forcefullyCrashRenderer()
      })
      this.views = []

      const topBar = createWebView(getRendererUrl('tabs'), 0, 0, width, 55)
      topBar['id'] = 'top-bar'
      this.views.push(topBar)
      this.win.contentView.addChildView(topBar)
      return
    } else if (url.startsWith('/')) {
      finalUrl = getRendererUrl(url.replace(/^\//, ''))
      console.log('Loading internal URL:', finalUrl)
    }

    const [width, height] = this.win.getSize()
    const existingView = this.views.find((v) => v['id'] === `tab-${id}`)

    if (existingView) {
      existingView.webContents.loadURL(finalUrl)
      existingView.setBounds({ x: 0, y: 55, width: width - 15, height: height - 120 })
      handleIpc(existingView)
    } else {
      const view = createWebView(finalUrl, 0, 55, width, height)
      view['id'] = `tab-${id}`
      this.views.push(view)
      this.win.contentView.addChildView(view)
      handleIpc(view)
      attachContextMenu(view.webContents)
      handleExternalLinks(view.webContents)
    }

    const savedTabs = store.get('tabs', [])
    const index = (savedTabs as { id: string }[]).findIndex((t) => t.id === id)

    if (!url.startsWith('/storedTab')) {
      if (index >= 0) {
        ;(savedTabs as { id: string; url?: string }[])[index].url = finalUrl
      } else {
        ;(savedTabs as { id: string; url?: string }[]).push({ id, url: finalUrl })
      }
      store.set('tabs', savedTabs)
    }
    store.set('activeTab', id)
  }

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager()
    }
    return WindowManager.instance
  }
}

function handleIpc(view: WebContentsView): void {
  const webContents = view.webContents

  const dropHandler = (_event: Electron.IpcMainEvent, data: any): void => {
    if (!webContents || webContents.isDestroyed()) return

    // Check if this event is meant for this webContents
    if (data.type === 'files' && data.files?.length > 0) {
      const file = data.files[0] // Take first file for simplicity
      const ext = path.extname(file.filePath).toLowerCase()

      if (ext === '.html' || ext === '.htm') {
        webContents.loadFile(file.filePath)
      } else if (ext === '.txt') {
        readFile(file.filePath, 'utf8', (err, content) => {
          if (err) {
            console.error('Error reading file:', err)
            return
          }
          const html = `
            <html>
              <head><meta charset="utf-8"><title>${file.fileName}</title></head>
              <body style="font-family: sans-serif; padding: 1rem; white-space: pre-wrap;">
                ${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
              </body>
            </html>`
          webContents.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
        })
      } else {
        webContents.loadURL(
          'data:text/plain;charset=utf-8,' +
            encodeURIComponent(`Unsupported file: ${file.fileName}`)
        )
      }
    }
  }

  ipcMain.on('dropped-data', dropHandler)

  webContents.once('destroyed', () => {
    ipcMain.removeListener('dropped-data', dropHandler)
  })
}

function getRendererUrl(route): string {
  const queryString = route ? `#/${route}` : ''
  if (app.isPackaged) {
    return `file://${path.join(__dirname, '../renderer/index.html')}${queryString}`
  } else {
    // return `file://${path.join(__dirname, '../renderer/index.html')}${queryString}`
    return `http://localhost:5173/${queryString}`
  }
}

let settingsWindow: BrowserWindow | null = null
let aboutWindow: BrowserWindow | null = null

function createSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    title: 'Workspace Mail',
    autoHideMenuBar: true,
    parent: WindowManager.getInstance().win,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: `persist:tab-${crypto.randomUUID()}`
    }
  })

  settingsWindow.setMenuBarVisibility(false)
  settingsWindow.setAutoHideMenuBar(true)
  settingsWindow.loadURL(getRendererUrl('settings'))

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

function createAboutWindow(): void {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.focus()
    return
  }

  aboutWindow = new BrowserWindow({
    width: 600,
    height: 500,
    title: 'Workspace Mail - About',
    autoHideMenuBar: true,
    parent: WindowManager.getInstance().win,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: `persist:tab-${crypto.randomUUID()}`
    }
  })

  aboutWindow.setMenuBarVisibility(false)
  aboutWindow.setAutoHideMenuBar(true)
  aboutWindow.loadURL(getRendererUrl('about'))

  aboutWindow.on('closed', () => {
    aboutWindow = null
  })
}

ipcMain.handle('get-tabs', async () => {
  const tabs = store.get('tabs', [])
  return tabs
})

ipcMain.handle('save-tabs', async (_event, tabs) => {
  store.set('tabs', tabs)
  return { success: true }
})

ipcMain.handle('store-get', (_event, key) => {
  return store.get(key)
})

ipcMain.handle('store-set', (_event, key, value) => {
  store.set(key, value)
})

ipcMain.handle('encrypt', async (_, text: string) => {
  if (!text || text === '' || text === 'undefined' || text === 'null') {
    return ''
  }
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
})
ipcMain.handle('decrypt', async (_, encrypted) => {
  try {
    // Basic input validation
    if (
      !encrypted ||
      typeof encrypted !== 'string' ||
      encrypted.trim() === '' ||
      encrypted === 'undefined' ||
      encrypted === 'null'
    ) {
      console.warn('Empty or invalid input to decryptPassword')
      return ''
    }

    // Expecting format: <ivHex>:<encryptedText>
    const parts = encrypted.split(':')
    if (parts.length !== 2) {
      console.error('Invalid encrypted format - missing or too many IV separators')
      return ''
    }

    const [ivHex, encryptedText] = parts

    // Validate IV format and length (128 bits = 16 bytes = 32 hex chars)
    if (!/^[0-9a-fA-F]{32}$/.test(ivHex)) {
      console.error('Invalid IV format or length')
      return ''
    }

    if (!encryptedText || encryptedText.trim() === '') {
      console.error('Missing encrypted text')
      return ''
    }

    const iv = Buffer.from(ivHex, 'hex')
    if (iv.length !== 16) {
      console.error('IV buffer length is not 16 bytes')
      return ''
    }

    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('Decryption failed:', error)
    return ''
  }
})

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
 let baseUpdateUrl = 'http://localhost:5500/updates';
  if (!app.isPackaged) {
    log.info('Skipping auto-update checks in development');
    return;
  }

  // Set the update server URL for manual and auto checks
  if (process.platform === 'win32') {
    autoUpdater.setFeedURL(`${baseUpdateUrl}/win32`);
  } else if (process.platform === 'darwin') {
    autoUpdater.setFeedURL(`${baseUpdateUrl}/darwin`);
  }else if (process.platform === 'linux') {
    autoUpdater.setFeedURL(`${baseUpdateUrl}/linux`);
  }

  // Attach event listeners (always attach so manual updates work)
  attachAutoUpdateListeners();

  const isAutoUpdateEnabled = store.get('autoUpdate', true) as boolean;

  if (!isAutoUpdateEnabled) {
    log.info('Auto-update is disabled; manual update only.');
    return; // Don't do background or scheduled checks
  }

  // Auto check for updates if enabled
  autoUpdater.checkForUpdates();
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 12 * 60 * 60 * 1000);
}


function attachAutoUpdateListeners() {
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info(`Update available: ${info.version}`);
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available. Would you like to download it now?`,
      buttons: ['Download', 'Later'],
    }).then(result => {
      if (result.response === 0) {
        log.info('User accepted update. Starting download...');
        autoUpdater.downloadUpdate();
      } else {
        log.info('User postponed update.');
      }
    });
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No updates available');
  });

  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
    const mainWindow = WindowManager.getInstance().win;
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Update Error',
      message: 'Failed to check for updates: ' + err.message,
      buttons: ['OK'],
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    log.info(`Download progress: ${Math.floor(progress.percent)}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded, ready to install');
    dialog.showMessageBox({
      type: 'info',
      buttons: ['Restart Now', 'Later'],
      title: 'Application Update',
      message: 'A new version has been downloaded. Restart the application to apply the updates.',
      detail: `Version ${info.version} is ready to install.`
    }).then((returnValue) => {
      if (returnValue.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
}


  autoUpdater.on('update-not-available', () => {
    log.info('No updates available');
  });

  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
    const mainWindow = WindowManager.getInstance().win;
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Update Error',
      message: 'Failed to check for updates: ' + err.message,
      buttons: ['OK'],
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    log.info(`Download progress: ${Math.floor(progress.percent)}%`);
  });

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded, ready to install');
  isUpdateDownloaded = true;

  createAppMenu(
    createAboutWindow,
    createSettingsWindow,
    () => store.get('storageLocation', app.getPath('downloads')) as string
  );

  const dialogOpts: Electron.MessageBoxOptions = {
    type: 'info',
    buttons: ['Restart Now', 'Later'],
    title: 'Application Update',
    message: 'A new version has been downloaded. Restart the application to apply the updates.',
    detail: `Version ${info.version} is ready to install.`
  };

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});


// App Initialization
app.whenReady().then(() => {
  const mainWindowManager = WindowManager.getInstance()

setupAutoUpdater();
  app.on('window-all-closed', () => {
    const hasOtherWindows = BrowserWindow.getAllWindows().some((win) => {
      return win !== mainWindowManager.win && !win.isDestroyed()
    })

    if (hasOtherWindows) {
      return
    }

    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('web-contents-created', (_, contents) => {
    attachContextMenu(contents)
  })

  createAppMenu(
    createAboutWindow,
    createSettingsWindow,
    () => store.get('storageLocation', app.getPath('downloads')) as string
  )

  ipcMain.handle('getStorageLocation', () => {
    return store.get('storageLocation', app.getPath('downloads'))
  })

  ipcMain.handle('setStorageLocation', (_event, location: string) => {
    store.set('storageLocation', location)
  })

  ipcMain.handle('clear-store', async () => {
    try {
      store.clear()
      return { success: true, message: 'Store cleared successfully.' }
    } catch (error) {
      console.error('Error clearing store:', error)
      return { success: false, message: 'Failed to clear store.' }
    }
  })
  ipcMain.handle('browse-storage-location', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  ipcMain.on('restart-app', () => {
    app.relaunch()
    app.exit(0)
    // app.exit()
  })
})
