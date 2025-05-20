import { app, BrowserWindow, ipcMain } from 'electron';
import { WindowManager } from '../windows/manager';
import { AutoUpdateService } from './autoUpdater';
import { MenuService } from './menu';
import Store from 'electron-store';
import { EncryptionService } from '../encryption';
import { IpcHandler } from '../webContents/ipcHandlers';

export class ElectronApp {
  private store = new Store();
  private encryptionService = new EncryptionService(process.env.SECRET_KEY || 'kavindu');
  private windowManager = WindowManager.getInstance();
  private autoUpdateService = new AutoUpdateService(this.store);
  private menuService = new MenuService(this.store);
  private ipcHandler = new IpcHandler(this.store, this.encryptionService);

  initialize() {
    app.whenReady().then(() => {
      this.setupApp();
    });
  }

  private setupApp() {
    this.setupWindowListeners();
    this.menuService.createAppMenu();
    this.autoUpdateService.setup();
  }

  private setupWindowListeners() {
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit();
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        WindowManager.getInstance();
      }
    });
  }
}

new ElectronApp().initialize();
