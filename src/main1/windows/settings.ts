import { BrowserWindow } from 'electron';
import path from 'path';
import { getRendererUrl } from '../utils/url';
import { WindowManager } from './manager';

let settingsWindow: BrowserWindow | null = null;

export function createSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    title: 'Workspace Mail - Settings',
    autoHideMenuBar: true,
    parent: WindowManager.getInstance().win,
    webPreferences: {
      preload: path.join(__dirname, '../../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: `persist:settings-${Date.now()}`
    }
  });

  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.loadURL(getRendererUrl('settings'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}
