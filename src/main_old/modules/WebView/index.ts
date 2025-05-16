import { WebContentsView } from 'electron'
import * as path from 'path'

export const createWebView = (rendererUrl: string, x: number, y: number, width: number, height: number): WebContentsView => {
  const preloadPath = path.join(__dirname, '../preload/index.js')

  const view = new WebContentsView({
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  })

  view.webContents.loadURL(rendererUrl)
  view.setBounds({ x, y, width, height })

  return view
}
