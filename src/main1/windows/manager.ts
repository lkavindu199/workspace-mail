import { BrowserWindow, WebContentsView } from 'electron';
import path from 'path';
import { BaseWindow } from './baseWindow';
import { ViewManager } from '../webContents/viewManager';
import Store from 'electron-store';
import { getRendererUrl } from '../utils/url';

export class WindowManager {
  private static instance: WindowManager;
  public win: BaseWindow;
  public viewManager: ViewManager;
  private store = new Store();

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
    });

    this.viewManager = new ViewManager(this.win);
    this.setupInitialViews();
    this.setupEventListeners();
  }

  private setupInitialViews() {
    const [width] = this.win.getSize();
    const topBar = this.viewManager.createWebView({
      url: getRendererUrl('tabs'),
      bounds: { x: 0, y: 0, width, height: 55 },
      id: 'top-bar'
    });
    this.win.contentView.addChildView(topBar);
  }

  private setupEventListeners() {
    this.win.on('resize', () => this.viewManager.resizeViews());

    ipcMain.on('open-new-window', (_, url: string, id: string) => {
      this.viewManager.openNewWindow(url, id);
    });

    ipcMain.on('activate-tab', (_, id: string) => {
      this.viewManager.activateTab(id);
    });

    ipcMain.on('refresh-all', () => {
      this.refreshAll();
    });
  }

  public refreshAll(): void {
    this.win.webContents?.reload();
    this.viewManager.refreshAllViews();
  }

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }
}
