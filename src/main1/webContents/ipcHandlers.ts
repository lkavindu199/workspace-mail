import { ipcMain, dialog } from 'electron';
import { appStore } from '../store';
import { EncryptionService } from '../encryption';

export class IpcHandler {
  constructor(
    private store: typeof appStore,
    private encryptionService: EncryptionService
  ) {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // Tab management
    ipcMain.handle('get-tabs', () => this.store.getTabs());
    ipcMain.handle('save-tabs', (_, tabs) => this.store.saveTabs(tabs));

    // Store operations
    ipcMain.handle('store-get', (_, key) => this.store.get(key));
    ipcMain.handle('store-set', (_, key, value) => this.store.set(key, value));
    ipcMain.handle('clear-store', () => {
      try {
        this.store.clear();
        return { success: true, message: 'Store cleared successfully.' };
      } catch (error) {
        Sentry.captureException(error);
        return { success: false, message: 'Failed to clear store.' };
      }
    });

    // Storage location
    ipcMain.handle('getStorageLocation', () =>
      this.store.getStorageLocation(app.getPath('downloads')));
    ipcMain.handle('setStorageLocation', (_, location: string) =>
      this.store.setStorageLocation(location));
    ipcMain.handle('browse-storage-location', async () => {
      const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
      return result.canceled ? null : result.filePaths[0];
    });

    // Encryption
    ipcMain.handle('encrypt', (_, text: string) => this.encryptionService.encrypt(text));
    ipcMain.handle('decrypt', (_, encrypted: string) => this.encryptionService.decrypt(encrypted));

    // App control
    ipcMain.on('restart-app', () => {
      app.relaunch();
      app.exit(0);
    });
  }
}
