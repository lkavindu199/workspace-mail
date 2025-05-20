import { BrowserWindowConstructorOptions, ContextMenuParams, WebContents } from 'electron';

// Window types
export interface WindowOptions extends BrowserWindowConstructorOptions {
  id?: string;
  persistent?: boolean;
}

// Context menu types
export interface ContextMenuHandler {
  createContextMenu(webContents: WebContents, params: ContextMenuParams): Electron.Menu;
  attachToWebContents(webContents: WebContents): void;
}

// WebContentsView types
export interface WebViewOptions {
  url: string;
  bounds: Electron.Rectangle;
  id: string;
  partition?: string;
}

// IPC types
export interface IpcHandlers {
  registerHandlers(): void;
}

// Store types
export interface Tab {
  id: string;
  url?: string;
  username?: string;
  password?: string;
}

export interface StorageLocation {
  path: string;
  lastSelected: Date;
}
