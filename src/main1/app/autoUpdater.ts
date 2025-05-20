import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { dialog, Notification, BrowserWindow } from 'electron';
import Store from 'electron-store';
import { WindowManager } from '../windows/manager';

export class AutoUpdateService {
  private isUpdateDownloaded = false;
  private shouldInstallOnQuit = false;

  constructor(private store: Store) {}

  setup(): void {
    if (!this.isAutoUpdateEnabled()) {
      log.info('Auto-update is disabled; manual update only.');
      return;
    }

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;
    this.setFeedURL();
    this.attachListeners();
    this.checkForUpdates();
    this.setupPeriodicChecks();
  }

  private isAutoUpdateEnabled(): boolean {
    return this.store.get('autoUpdate', true) as boolean;
  }

  private setFeedURL(): void {
    const baseUpdateUrl = 'https://storage.googleapis.com/workspacemail-updates';
    if (process.platform === 'win32') {
      autoUpdater.setFeedURL(`${baseUpdateUrl}/win`);
    } else if (process.platform === 'darwin') {
      autoUpdater.setFeedURL(`${baseUpdateUrl}/darwin`);
    } else if (process.platform === 'linux') {
      autoUpdater.setFeedURL(`${baseUpdateUrl}/linux`);
    }
  }

  private attachListeners(): void {
    autoUpdater.on('update-available', (info) => {
      log.info(`Update available: ${info.version}`);
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.handleUpdateDownloaded(info);
    });

    app.on('before-quit', () => {
      if (this.isUpdateDownloaded && this.shouldInstallOnQuit) {
        autoUpdater.quitAndInstall(true, false);
      }
    });
  }

  private handleUpdateDownloaded(info: any): void {
    this.isUpdateDownloaded = true;
    this.shouldInstallOnQuit = false;

    const mainWindow = WindowManager.getInstance().win;
    if (!mainWindow || mainWindow.isDestroyed()) return;

    new Notification({
      title: 'Update Ready',
      body: `Version ${info.version} is ready to install. Click to restart.`,
      silent: true
    }).show();

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['Restart Now', 'Later'],
      title: 'Application Update',
      message: 'A new version has been downloaded. Restart the application to apply the updates.',
      detail: `Version ${info.version} is ready to install.`,
      cancelId: 1
    }).then((returnValue) => {
      if (returnValue.response === 0) {
        autoUpdater.quitAndInstall();
      } else {
        this.shouldInstallOnQuit = true;
      }
    });
  }
}
