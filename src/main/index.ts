import {
  app,
  BrowserWindow,
  shell,
  Menu,
  MenuItem,
  session,
  WebContentsView,
  WebContents,
  ContextMenuParams,
  ipcMain,
  dialog,
  Notification
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
import * as Sentry from "@sentry/electron/main"
// import { RewriteFrames } from '@sentry/integrations'

if (app.isPackaged) {
  // Instead of Sentry.init()
  Sentry.init({

    dsn: "https://1cb9c612462fa2363bc9746b28a30f08@o4509347214786560.ingest.us.sentry.io/4509348053188608",
    release: app.getVersion(),
    integrations: [
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
    ],
    beforeSend(event) {
      return event;
    },
  });

}
dotenv.config()


let isUpdateDownloaded = false;
let shouldInstallOnQuit = false;
let isOnline = true;
let lastOnlineStatus = true;

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
      // console.log('Empty or invalid input to decryptPassword')
      return ''
    }

    // Expecting format: <ivHex>:<encryptedText>
    const parts = encrypted.split(':')
    if (parts.length !== 2) {
      // console.log('Invalid encrypted format - missing or too many IV separators')
      return ''
    }

    const [ivHex, encryptedText] = parts

    // Validate IV format and length (128 bits = 16 bytes = 32 hex chars)
    if (!/^[0-9a-fA-F]{32}$/.test(ivHex)) {
      // console.log('Invalid IV format or length')
      return ''
    }

    if (!encryptedText || encryptedText.trim() === '') {
      // console.log('Missing encrypted text')
      return ''
    }

    const iv = Buffer.from(ivHex, 'hex')
    if (iv.length !== 16) {
      // console.log('IV buffer length is not 16 bytes')
      return ''
    }

    // Proceed with decryption
    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('Decryption failed:', error)
    Sentry.captureException(error, {
      extra: { encrypted: encrypted ? 'present' : 'missing' }
    })
    return ''
  }
}

function monitorNetworkConnection() {
  const onlineStatusPoll = setInterval(async () => {
    try {
      // Try to fetch a small file from a reliable server
      await fetch('https://www.google.com/favicon.ico', { method: 'HEAD' });
      isOnline = true;
    } catch (error) {
      isOnline = false;
    }

    // Only notify if status changed
    if (isOnline !== lastOnlineStatus) {
      lastOnlineStatus = isOnline;

      const mainWindow = WindowManager.getInstance().win;
      if (!mainWindow || mainWindow.isDestroyed()) return;

      if (isOnline) {
        // Connection restored
        new Notification({
          title: 'Connection Restored',
          body: 'Internet connection has been restored.',
          silent: false
        }).show();

        // Refresh the app
        WindowManager.getInstance().refreshAll();
      } else {
        // Connection lost
        new Notification({
          title: 'Connection Lost',
          body: 'No internet connection detected.',
          silent: false
        }).show();
      }
    }
  }, 5000); // Check every 5 seconds

  // Clean up on app quit
  app.on('before-quit', () => {
    clearInterval(onlineStatusPoll);
  });
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
              if (result) console.log('Failed to open folder:', result);
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => {
            const mainWindow = WindowManager.getInstance().win;
            const checkingNotification = new Notification({
              title: 'Checking for Updates',
              body: 'Looking for the latest version...'
            });
            checkingNotification.show();

            autoUpdater.checkForUpdates()
              .then((result) => {
                if (!result) {
                  throw new Error('No update information received');
                }

                const currentVersion = app.getVersion();
                const availableVersion = result.updateInfo.version;

                // Extract build numbers
                const currentBuildMatch = app.getVersion().match(/\d+$/); // Assuming version ends with build number
                const availableBuildMatch = result.updateInfo.version.match(/\d+$/);

                const currentBuild = currentBuildMatch ? parseInt(currentBuildMatch[0]) : 0;
                const availableBuild = availableBuildMatch ? parseInt(availableBuildMatch[0]) : 0;

                if (availableVersion !== currentVersion || availableBuild > currentBuild) {
                  new Notification({
                    title: 'Update Available',
                    body: `Version ${availableVersion} (build ${availableBuild}) is available! (Current: ${currentVersion} build ${currentBuild})`
                  }).show();

                  dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'Update Available',
                    message: `A new version (${availableVersion} build ${availableBuild}) is available!`,
                    detail: `You're currently running version ${currentVersion} build ${currentBuild}. The update will be downloaded automatically.`,
                    buttons: ['OK']
                  });
                } else {
                  new Notification({
                    title: 'Up to Date',
                    body: `You're already running the latest version (${currentVersion} build ${currentBuild}).`
                  }).show();
                }
              })
              .catch(err => {
                Sentry.captureException(err);
                console.error('Manual update check failed:', err);

                new Notification({
                  title: 'Update Error',
                  body: 'Failed to check for updates!'
                }).show();

                dialog.showMessageBox(mainWindow, {
                  type: 'error',
                  title: 'Update Error',
                  message: 'Failed to check for updates!',
                  detail: err.message,
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
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            WindowManager.getInstance().refreshAll();
          }
        },
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
          if (err) console.log('OnlyOffice failed to launch:', err)
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
  height: number,
  id?: string,
): WebContentsView {
  const preloadPath = path.join(__dirname, '../preload/index.js')

  console.log('Creating WebView with URL:', rendererUrl, '  id', id)
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
      partition: `persist:tab-${id || crypto.randomUUID()}`
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
  const menu = new Menu();

  // Spellcheck suggestions
  if (params.misspelledWord) {
    if (params.dictionarySuggestions.length > 0) {
      for (const suggestion of params.dictionarySuggestions) {
        menu.append(
          new MenuItem({
            label: suggestion,
            click: () => webContents.replaceMisspelling(suggestion),
          })
        );
      }
    } else {
      menu.append(
        new MenuItem({
          label: 'No suggestions',
          enabled: false,
        })
      );
    }
    menu.append(new MenuItem({ type: 'separator' }));
  }

  // Copy (only if text is selected)
  if (params.selectionText && params.selectionText.trim() !== '') {
    menu.append(new MenuItem({ role: 'copy', label: 'Copy' }));
  }

  // Paste (only if in an editable area)
  if (params.isEditable) {
    menu.append(new MenuItem({ role: 'cut', label: 'Cut' }));
    menu.append(new MenuItem({ role: 'paste', label: 'Paste' }));
  }

  // Only show separator if at least one of Cut/Copy/Paste was added
  if (params.selectionText || params.isEditable) {
    menu.append(new MenuItem({ type: 'separator' }));
  }

  // Select All
  menu.append(new MenuItem({ role: 'selectAll', label: 'Select All' }));

  // DevTools option
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(
    new MenuItem({
      label: 'Open DevTools',
      click: () => webContents.openDevTools({ mode: 'detach' }),
    })
  );

  return menu;
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
    Sentry.captureException(err);
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
interface Tab {
  id: string;
  url?: string;
  username?: string;
  password?: string;
}

interface LoginState {
  retryCount: number;
  isHandling: boolean;
  wasLoggedIn: boolean;
  lastUrl?: string;
  loginPageTimer?: NodeJS.Timeout;
  autoLoginInterval?: NodeJS.Timeout;
}

class WindowManager {
  private static instance: WindowManager;
  public win: BaseWindow;
  public views: WebContentsView[] = [];
  private loginStates: Map<string, LoginState> = new Map();

  // private setupUrlChangeMonitoring(view: WebContentsView): void {
  //   const webContents = view.webContents;
  //   const tabId = view['id']?.replace('tab-', '');
  //   if (!tabId) return;

  //   if (!this.loginStates) {
  //     this.loginStates = new Map<string, {
  //       retryCount: number;
  //       isHandling: boolean;
  //       wasLoggedIn: boolean;
  //       lastUrl?: string;
  //       loginPageTimer?: NodeJS.Timeout;
  //       autoLoginInterval?: NodeJS.Timeout;
  //     }>();
  //   }

  //   if (!this.loginStates.has(tabId)) {
  //     this.loginStates.set(tabId, {
  //       retryCount: 0,
  //       isHandling: false,
  //       wasLoggedIn: false,
  //     });
  //   }

  //   const urlChangeHandler = async (_event: Electron.Event, url: string) => {
  //     if (!tabId) return;

  //     console.log(`URL changed for tab ${tabId}:`, url);
  //     const state = this.loginStates.get(tabId);
  //     if (!state) return;

  //     state.lastUrl = url;
  //     this.loginStates.set(tabId, state);

  //     if (!url.includes('/root#/login')) {
  //       if (state.loginPageTimer) {
  //         clearTimeout(state.loginPageTimer);
  //         state.loginPageTimer = undefined;
  //       }
  //       if (state.autoLoginInterval) {
  //         clearInterval(state.autoLoginInterval);
  //         state.autoLoginInterval = undefined;
  //       }
  //     }

  //     if (url.includes('/root#/email')) {
  //       console.log(`[${tabId}] User successfully logged in.`);
  //       state.wasLoggedIn = true;
  //       state.retryCount = 0;

  //       if (state.loginPageTimer) {
  //         clearTimeout(state.loginPageTimer);
  //         state.loginPageTimer = undefined;
  //       }
  //       if (state.autoLoginInterval) {
  //         clearInterval(state.autoLoginInterval);
  //         state.autoLoginInterval = undefined;
  //       }
  //       this.loginStates.set(tabId, state);
  //       return;
  //     }

  //     if (url.includes('/interface/autologin')) {
  //       console.log(`[${tabId}] Auto-login redirect detected - allowing to proceed`);
  //       return;
  //     }

  //     if (url.includes('/root#/login') && state.wasLoggedIn) {
  //       console.log(`[${tabId}] Detected logout. Resetting login state.`);
  //       state.wasLoggedIn = false;
  //       state.retryCount = 0;
  //       this.loginStates.set(tabId, state);
  //       return;
  //     }

  //     if (!url.includes('squareworkspace.com')) {
  //       console.log(`[${tabId}] Navigated outside app - resetting login state.`);
  //       if (state.loginPageTimer) {
  //         clearTimeout(state.loginPageTimer);
  //         state.loginPageTimer = undefined;
  //       }
  //       if (state.autoLoginInterval) {
  //         clearInterval(state.autoLoginInterval);
  //         state.autoLoginInterval = undefined;
  //       }
  //       this.loginStates.delete(tabId);
  //       return;
  //     }

  //     if (url.includes('/root#/login') && !state.wasLoggedIn) {
  //       if (state.isHandling) {
  //         console.log(`[${tabId}] Already processing login - skipping`);
  //         return;
  //       }

  //       if (state.retryCount >= 3) {
  //         console.warn(`[${tabId}] Auto-login retry limit reached.`);
  //         return;
  //       }

  //       if (!state.loginPageTimer) {
  //         console.log(`[${tabId}] Starting 30-second timer before auto-login`);
  //         state.loginPageTimer = setTimeout(() => {
  //           if (state.lastUrl?.includes('/root#/login') && !state.wasLoggedIn) {
  //             this.tryAutoLogin(tabId, webContents);
  //           }
  //         }, 30000);
  //         this.loginStates.set(tabId, state);
  //       }
  //     }
  //   };

  //   // Attach event listeners
  //   webContents.on('did-navigate', urlChangeHandler);
  //   webContents.on('did-navigate-in-page', urlChangeHandler);

  //   // Clean up on tab close
  //   webContents.once('destroyed', () => {
  //     const state = this.loginStates.get(tabId);
  //     if (state) {
  //       if (state.loginPageTimer) {
  //         clearTimeout(state.loginPageTimer);
  //         state.loginPageTimer = undefined;
  //       }
  //       if (state.autoLoginInterval) {
  //         clearInterval(state.autoLoginInterval);
  //         state.autoLoginInterval = undefined;
  //       }
  //     }
  //     webContents.off('did-navigate', urlChangeHandler);
  //     webContents.off('did-navigate-in-page', urlChangeHandler);
  //     this.loginStates.delete(tabId);
  //   });
  // }

  // private async tryAutoLogin(tabId: string, webContents: Electron.WebContents) {
  //   const state = this.loginStates.get(tabId);
  //   if (!state || state.isHandling || state.wasLoggedIn || state.retryCount >= 3) return;

  //   const savedTabs = store.get('tabs', []) as Tab[];
  //   const tab = savedTabs.find(t => t.id === tabId);
  //   if (!tab || !tab.username || !tab.password) {
  //     console.warn(`[${tabId}] Missing tab credentials - skipping auto-login.`);
  //     return;
  //   }

  //   state.isHandling = true;
  //   state.retryCount++;
  //   this.loginStates.set(tabId, state);

  //   try {
  //     console.log(`[${tabId}] Attempting auto-login (Retry #${state.retryCount}) for: ${tab.username}`);

  //     const authenticatedUrl = await this.authenticateAccount(tab.username, tab.password);

  //     if (authenticatedUrl) {
  //       console.log(`[${tabId}] Auto-login successful. Redirecting...`);

  //       setTimeout(() => {
  //         if (!webContents.isDestroyed()) {
  //           webContents.loadURL(authenticatedUrl);
  //         }
  //       }, 500);

  //       state.retryCount = 0;
  //       state.wasLoggedIn = true;

  //       if (state.loginPageTimer) {
  //         clearTimeout(state.loginPageTimer);
  //         state.loginPageTimer = undefined;
  //       }
  //       if (state.autoLoginInterval) {
  //         clearInterval(state.autoLoginInterval);
  //         state.autoLoginInterval = undefined;
  //       }
  //     } else {
  //       console.warn(`[${tabId}] No authenticated URL returned.`);
  //       this.setupAutoLoginInterval(tabId, webContents);
  //     }
  //   } catch (error) {
  //     console.error(`[${tabId}] Auto-login error:`, error);
  //     Sentry.captureException(error);
  //     this.setupAutoLoginInterval(tabId, webContents);
  //   } finally {
  //     state.isHandling = false;
  //     this.loginStates.set(tabId, state);
  //   }
  // }
  private setupUrlChangeMonitoring(view: WebContentsView): void {
    const webContents = view.webContents;
    const tabId = view['id']?.replace('tab-', '');
    if (!tabId) return;

    if (!this.loginStates) {
      this.loginStates = new Map<string, {
        retryCount: number;
        isHandling: boolean;
        wasLoggedIn: boolean;
        lastUrl?: string;
        loginPageTimer?: NodeJS.Timeout;
        autoLoginInterval?: NodeJS.Timeout;
      }>();
    }

    if (!this.loginStates.has(tabId)) {
      this.loginStates.set(tabId, {
        retryCount: 0,
        isHandling: false,
        wasLoggedIn: false,
      });
    }

    const urlChangeHandler = async (_event: Electron.Event, url: string) => {
      if (!tabId) return;

      console.log(`URL changed for tab ${tabId}:`, url);
      const state = this.loginStates.get(tabId);
      if (!state) return;

      state.lastUrl = url;
      this.loginStates.set(tabId, state);

      if (!url.includes('/root#/login')) {
        if (state.loginPageTimer) {
          clearTimeout(state.loginPageTimer);
          state.loginPageTimer = undefined;
        }
        if (state.autoLoginInterval) {
          clearInterval(state.autoLoginInterval);
          state.autoLoginInterval = undefined;
        }
      }

      if (url.includes('/root#/email')) {
        console.log(`[${tabId}] User successfully logged in.`);
        state.wasLoggedIn = true;
        state.retryCount = 0;

        if (state.loginPageTimer) {
          clearTimeout(state.loginPageTimer);
          state.loginPageTimer = undefined;
        }
        if (state.autoLoginInterval) {
          clearInterval(state.autoLoginInterval);
          state.autoLoginInterval = undefined;
        }

        this.loginStates.set(tabId, state);
        return;
      }

      if (url.includes('/interface/autologin')) {
        console.log(`[${tabId}] Auto-login redirect detected - allowing to proceed`);
        return;
      }

      if (url.includes('/root#/login') && state.wasLoggedIn) {
        console.log(`[${tabId}] Detected logout. Will attempt auto-login in 30 seconds.`);
        state.wasLoggedIn = false;
        state.retryCount = 0;
        this.loginStates.set(tabId, state);

        // new Notification({
        //   title: 'Logged Out',
        //   body: 'You have been logged out. Will attempt to log back in 30 seconds...',
        //   silent: false
        // }).show();

        state.loginPageTimer = setTimeout(() => {
          if (state.lastUrl?.includes('/root#/login') && !state.wasLoggedIn) {
            this.tryAutoLogin(tabId, webContents);
          }
        }, 30000);

        this.loginStates.set(tabId, state);
        return;
      }

      if (!url.includes('squareworkspace.com')) {
        console.log(`[${tabId}] Navigated outside app - resetting login state.`);
        if (state.loginPageTimer) {
          clearTimeout(state.loginPageTimer);
          state.loginPageTimer = undefined;
        }
        if (state.autoLoginInterval) {
          clearInterval(state.autoLoginInterval);
          state.autoLoginInterval = undefined;
        }
        this.loginStates.delete(tabId);
        return;
      }

      if (url.includes('/root#/login') && !state.wasLoggedIn) {
        if (state.isHandling) {
          console.log(`[${tabId}] Already processing login - skipping`);
          return;
        }

        if (state.retryCount >= 3) {
          console.warn(`[${tabId}] Auto-login retry limit reached.`);

          new Notification({
            title: 'Auto-Login Failed',
            body: 'Maximum retry attempts reached. Please check your credentials.',
            silent: false
          }).show();

          return;
        }

        if (!state.loginPageTimer) {
          console.log(`[${tabId}] Starting 30-second timer before auto-login`);

          // new Notification({
          //   title: 'Auto-Login Starting',
          //   body: 'Attempting to log in automatically in 30 seconds...',
          //   silent: false
          // }).show();

          state.loginPageTimer = setTimeout(() => {
            if (state.lastUrl?.includes('/root#/login') && !state.wasLoggedIn) {
              this.tryAutoLogin(tabId, webContents);
            }
          }, 30000);
          this.loginStates.set(tabId, state);
        }
      }
    };

    webContents.on('did-navigate', urlChangeHandler);
    webContents.on('did-navigate-in-page', urlChangeHandler);

    webContents.once('destroyed', () => {
      const state = this.loginStates.get(tabId);
      if (state) {
        if (state.loginPageTimer) {
          clearTimeout(state.loginPageTimer);
          state.loginPageTimer = undefined;
        }
        if (state.autoLoginInterval) {
          clearInterval(state.autoLoginInterval);
          state.autoLoginInterval = undefined;
        }
      }
      webContents.off('did-navigate', urlChangeHandler);
      webContents.off('did-navigate-in-page', urlChangeHandler);
      this.loginStates.delete(tabId);
    });
  }

  private async tryAutoLogin(tabId: string, webContents: Electron.WebContents) {
    const state = this.loginStates.get(tabId);
    if (!state || state.isHandling || state.wasLoggedIn || state.retryCount >= 3) return;

    const savedTabs = store.get('tabs', []) as Tab[];
    const tab = savedTabs.find(t => t.id === tabId);
    if (!tab || !tab.username || !tab.password) {
      console.warn(`[${tabId}] Missing tab credentials - skipping auto-login.`);
      return;
    }

    this.clearPartition(tabId);

    state.isHandling = true;
    state.retryCount++;
    this.loginStates.set(tabId, state);

    try {
      console.log(`[${tabId}] Attempting auto-login (Retry #${state.retryCount}) for: ${tab.username}`);

      const authenticatedUrl = await this.authenticateAccount(tab.username, tab.password);

      if (authenticatedUrl) {
        console.log(`[${tabId}] Auto-login successful. Redirecting...`);

        setTimeout(() => {
          if (!webContents.isDestroyed()) {
            webContents.loadURL(authenticatedUrl);
          }
        }, 500);

        state.retryCount = 0;
        state.wasLoggedIn = true;

        if (state.loginPageTimer) {
          clearTimeout(state.loginPageTimer);
          state.loginPageTimer = undefined;
        }
        if (state.autoLoginInterval) {
          clearInterval(state.autoLoginInterval);
          state.autoLoginInterval = undefined;
        }
      } else {
        console.warn(`[${tabId}] No authenticated URL returned.`);
        this.setupAutoLoginInterval(tabId, webContents);
      }
    } catch (error) {
      console.error(`[${tabId}] Auto-login error:`, error);
      Sentry.captureException(error);

      this.setupAutoLoginInterval(tabId, webContents);
    } finally {
      state.isHandling = false;
      this.loginStates.set(tabId, state);
    }
  }
  private setupAutoLoginInterval(tabId: string, webContents: Electron.WebContents) {
    const state = this.loginStates.get(tabId);
    if (!state || state.autoLoginInterval) return;

    console.log(`[${tabId}] auto-login retry interval`);

    state.autoLoginInterval = setInterval(() => {
      if (state.lastUrl?.includes('/root#/login') && !state.wasLoggedIn && !state.isHandling) {
        this.tryAutoLogin(tabId, webContents);
      } else {
        if (state.autoLoginInterval) {
          clearInterval(state.autoLoginInterval);
          state.autoLoginInterval = undefined;
        }
      }
    }, 30000);

    this.loginStates.set(tabId, state);
  }


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

  public refreshAll(): void {
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
              console.warn(`Authentication failed for tab ID: ${tab.id}, using saved URL.`);
              this.clearPartition(tab.id);
            }
          }

          updatedTabs.push(updatedTab)
        } catch (error) {
          console.error(`Error loading tab ID ${tab.id}:`, error)
          Sentry.captureException(error)
          updatedTabs.push(tab)
          this.clearPartition(tab.id);
        }
      })
    )

    store.set('tabs', updatedTabs)
    // console.log('Updated saved tabs:', updatedTabs)

    updatedTabs.forEach((tab) => {
      console.log('Loading tab:', tab)
      const view = createWebView(tab.url || 'about:blank', 0, 55, width - 15, height - 120, tab.id)
      view['id'] = `tab-${tab.id}`
      this.views.push(view)
      this.win.contentView.addChildView(view)

      handleIpc(view)
      this.setupUrlChangeMonitoring(view)
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
    encryptedPassword: string,
    retryCount = 0
  ): Promise<string | null> {
    const loginUrl = 'https://mail.squareworkspace.com/api/v1/auth/authenticate-user';
    const MAX_RETRIES = 2;

    let password: string;
    try {
      password = decryptPassword(encryptedPassword);
    } catch (error) {
      console.log('Failed to decrypt password:', error);
      return null;
    }

    const loginData = {
      username: email,
      password: password,
      teamWorkspace: false,
      retrieveAutoLoginToken: true
    };

    try {
      console.log('Authenticating:', email);

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(`Authentication failed (HTTP ${response.status}):`, result.message);
        Sentry.captureException(result.message);

        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying authentication (attempt ${retryCount + 1})`);
          return this.authenticateAccount(email, encryptedPassword, retryCount + 1);
        }

        return null;
      }

      if (result.autoLoginUrl) {
        return result.autoLoginUrl;
      } else {
        console.log('Authentication successful but no autoLoginUrl received.');
        return null;
      }
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error during authentication:', error);

      // Retry logic
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying authentication (attempt ${retryCount + 1})`);
        return this.authenticateAccount(email, encryptedPassword, retryCount + 1);
      }

      return null;
    }
  }

  // Add this method to clear partition
  private clearPartition(tabId: string): void {
    try {
      const partitionName = `persist:tab-${tabId}`;
      const sessionInstance = session.fromPartition(partitionName)

      // Clear all storage and cache
      sessionInstance.clearStorageData();
      sessionInstance.clearCache();
      sessionInstance.clearAuthCache();
      sessionInstance.clearHostResolverCache();

      console.log(`Cleared partition for tab ${tabId}`);
    } catch (error) {
      console.error(`Error clearing partition for tab ${tabId}:`, error);
      Sentry.captureException(error);
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
                  console.log(`Failed to open file: ${result}`)
                } else {
                  console.log(`Successfully opened: ${savePath}`)
                }
              } catch (err) {
                Sentry.captureException(err)
                console.log('Error opening file:', err)
              }
            } else {
              console.log('File not ready after timeout, not opening.')
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
              Sentry.captureException(err)
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
              view = createWebView(tab.url || 'about:blank', 0, 55, width - 15, height - 120, tab.id)
              view['id'] = viewId
              this.views.push(view)
              this.win.contentView.addChildView(view)
              handleIpc(view)
              this.setupUrlChangeMonitoring(view)
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
      const view = createWebView(finalUrl, 0, 55, width, height, id)
      view['id'] = `tab-${id}`
      this.views.push(view)
      this.win.contentView.addChildView(view)
      handleIpc(view)
      this.setupUrlChangeMonitoring(view)
      attachContextMenu(view.webContents)
      handleExternalLinks(view.webContents)
    }

    const savedTabs = store.get('tabs', [])
    const index = (savedTabs as { id: string }[]).findIndex((t) => t.id === id)

    if (!url.startsWith('/storedTab')) {
      if (index >= 0) {
        ; (savedTabs as { id: string; url?: string }[])[index].url = finalUrl
      } else {
        ; (savedTabs as { id: string; url?: string }[]).push({ id, url: finalUrl })
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
            console.log('Error reading file:', err)
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
      console.log('Invalid encrypted format - missing or too many IV separators')
      return ''
    }

    const [ivHex, encryptedText] = parts

    // Validate IV format and length (128 bits = 16 bytes = 32 hex chars)
    if (!/^[0-9a-fA-F]{32}$/.test(ivHex)) {
      console.log('Invalid IV format or length')
      return ''
    }

    if (!encryptedText || encryptedText.trim() === '') {
      console.log('Missing encrypted text')
      return ''
    }

    const iv = Buffer.from(ivHex, 'hex')
    if (iv.length !== 16) {
      console.log('IV buffer length is not 16 bytes')
      return ''
    }

    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.log('Decryption failed:', error)
    return ''
  }
})


function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  let baseUpdateUrl = 'https://storage.googleapis.com/workspacemail-updates';
  if (!app.isPackaged) {
    log.info('Skipping auto-update checks in development');
    return;
  }

  if (process.platform === 'win32') {
    autoUpdater.setFeedURL(`${baseUpdateUrl}/win`);
  } else if (process.platform === 'darwin') {
    autoUpdater.setFeedURL(`${baseUpdateUrl}/darwin`);
  } else if (process.platform === 'linux') {
    autoUpdater.setFeedURL(`${baseUpdateUrl}/linux`);
  }

  attachAutoUpdateListeners();

  const isAutoUpdateEnabled = store.get('autoUpdate', true) as boolean;
  if (!isAutoUpdateEnabled) {
    log.info('Auto-update is disabled; manual update only.');
    return;
  }

  // Initial check
  autoUpdater.checkForUpdates().catch(err => {
    log.error('Initial update check failed:', err);
  });

  // Periodic checks
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(err => {
      log.error('Periodic update check failed:', err);
    });
  }, 12 * 60 * 60 * 1000);
}

function attachAutoUpdateListeners() {
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    new Notification({
      title: 'Auto-Login Starting',
      body: 'Attempting to log in automatically in 30 seconds...',
      silent: false
    }).show();
  });

  autoUpdater.on('update-available', (info) => {
    log.info(`Update available: ${info.version}`);
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No updates available');
  });

  autoUpdater.on('error', (err) => {
    Sentry.captureException(err);
    log.error('Update error:', err);
  });

  autoUpdater.on('download-progress', (progress) => {
    log.info(`Download progress: ${Math.floor(progress.percent)}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded, ready to install');
    isUpdateDownloaded = true;
    shouldInstallOnQuit = false;

    const newBuildMatch = info.version.match(/\d+$/);
    const newBuild = newBuildMatch ? newBuildMatch[0] : '0';

    createAppMenu(
      createAboutWindow,
      createSettingsWindow,
      () => store.get('storageLocation', app.getPath('downloads')) as string
    );

    const mainWindow = WindowManager.getInstance().win;
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const notification = {
      title: 'Update Ready',
      body: `Version ${info.version} (build ${newBuild}) is ready to install. Click to restart.`,
      silent: true
    };

    new Notification(notification).show();

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['Restart Now', 'Later'],
      title: 'Application Update',
      message: 'A new version has been downloaded. Restart the application to apply the updates.',
      detail: `Version ${info.version} is ready to install.`,
      cancelId: 1
    }).then((returnValue) => {
      if (returnValue.response === 0) {
        log.info('User accepted update install now');
        autoUpdater.quitAndInstall();
      } else {
        log.info('User postponed update installation');
        shouldInstallOnQuit = true;
      }
    });
  });

  app.on('before-quit', () => {
    if (isUpdateDownloaded && shouldInstallOnQuit) {
      autoUpdater.quitAndInstall(true, false);
    }
  });
}

app.on('open-url', (event, url) => {
  event.preventDefault()
  console.log('Mailto link opened:', url)
})
// App Initialization
app.whenReady().then(() => {
  const exePath = process.execPath
  const got = app.setAsDefaultProtocolClient('mailto', exePath, [
    path.resolve(process.argv[1])
  ])
  console.log('Protocol set:', got)

  const mainWindowManager = WindowManager.getInstance()
  monitorNetworkConnection();
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
      Sentry.captureException(error)
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
