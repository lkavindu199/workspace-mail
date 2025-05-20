import { Menu, MenuItem, shell, Notification, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import Store from 'electron-store';
import { WindowManager } from '../windows/manager';
import { createAboutWindow } from '../windows/about';
import { createSettingsWindow } from '../windows/settings';

export class MenuService {
  private isUpdateDownloaded = false;

  constructor(private store: Store) {}

  createAppMenu(): void {
    const isMac = process.platform === 'darwin';
    const template: Electron.MenuItemConstructorOptions[] = [
      this.createFileMenu(),
      this.createEditMenu(),
      this.createViewMenu(),
      this.createOfficeMenu(),
      this.createHelpMenu()
    ];

    if (this.isUpdateDownloaded) {
      const fileSubmenu = template[0].submenu as Electron.MenuItemConstructorOptions[];
      fileSubmenu.splice(fileSubmenu.length - 2, 0, {
        label: 'Restart to Update',
        click: () => autoUpdater.quitAndInstall()
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private createFileMenu(): Electron.MenuItemConstructorOptions {
    return {
      label: 'File',
      submenu: [
        { label: 'About Workspace Mail', click: createAboutWindow },
        { label: 'Settings', click: createSettingsWindow },
        this.createAttachmentsMenuItem(),
        { type: 'separator' },
        this.createUpdateCheckMenuItem(),
        this.createAutoUpdateMenuItem(),
        { type: 'separator' },
        { role: process.platform === 'darwin' ? 'close' : 'quit' }
      ]
    };
  }

  // ... other menu creation methods ...
}
