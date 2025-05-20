import { WebContentsView, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { ContextMenuService } from './contextMenu';
import { DownloadService } from './downloads';
import Store from 'electron-store';
import { getRendererUrl } from '../utils/url';

interface WebViewOptions {
  url: string;
  bounds: Electron.Rectangle;
  id: string;
}

export class ViewManager {
  private views: WebContentsView[] = [];
  private contextMenuService = new ContextMenuService();
  private downloadService = new DownloadService();
  private store = new Store();

  constructor(private mainWindow: BrowserWindow) {}

  createWebView(options: WebViewOptions): WebContentsView {
    const preloadPath = path.join(__dirname, '../../preload/index.js');
    const view = new WebContentsView({
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: true,
        partition: `persist:tab-${crypto.randomUUID()}`
      }
    });

    view.webContents.loadURL(options.url);
    view.setBounds(options.bounds);
    view['id'] = options.id;

    this.contextMenuService.attachToWebContents(view.webContents);
    this.downloadService.setupDownloads(view.webContents.session);
    this.setupExternalLinks(view.webContents);

    return view;
  }

  // ... other view management methods ...
}
