import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';

export class BaseWindow extends BrowserWindow {
  constructor(options: BrowserWindowConstructorOptions) {
    super({
      ...options,
      webPreferences: {
        ...options.webPreferences,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    });
  }
}
