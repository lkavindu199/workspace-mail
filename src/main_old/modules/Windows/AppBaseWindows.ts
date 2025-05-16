import { BrowserWindow } from 'electron'

export class BaseWindow extends BrowserWindow {
  constructor(options: Electron.BrowserWindowConstructorOptions) {
    super(options)
  }
}
