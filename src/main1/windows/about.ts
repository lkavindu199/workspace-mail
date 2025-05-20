import { BrowserWindow } from 'electron';
import path from 'path';
import { getRendererUrl } from '../utils/url';
import { WindowManager } from './manager';

let aboutWindow: BrowserWindow | null = null;

export function createAboutWindow(): void {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.focus();
    return;
  }

  aboutWindow = new BrowserWindow({
    width: 600,
    height: 500,
    title: 'Workspace Mail - About',
    autoHideMenuBar: true,
    parent: WindowManager.getInstance().win,
    webPreferences: {
      preload: path.join(__dirname, '../../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: `persist:about-${Date.now()}`
    }
  });

  aboutWindow.setMenuBarVisibility(false);
  aboutWindow.loadURL(getRendererUrl('about'));

  aboutWindow.on('closed', () => {
    aboutWindow = null;
  });
}
