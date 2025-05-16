import { ipcMain, IpcMainEvent } from 'electron'
import { WebContents } from 'electron'
import * as path from 'path'
import { readFile } from 'fs'
import { createWebView } from './WebView'

export const handleIpc = (view2: WebContentsView, win): void => {
  const webContents2 = view2.webContents

  // ipcMain.on('open-new-window', (event: IpcMainEvent, url: string) => {
  //   if (!webContents2) {
  //     console.error('view2 is not initialized')
  //   } else if (webContents2.isDestroyed()) {
  //     console.error('view2 webContents has been destroyed')
  //   } else {
  //     let finalUrl = url
  //     if (url.startsWith('/')) {
  //       finalUrl = `http://localhost:5173${url}`
  //     }

  //     const allViews = win.contentView
  //     console.log('allViews:', allViews);
  //     view2.setBounds({ x: 0, y: 55, width: 0, height: 0 })


  //     const view = createWebView('https://google.com', 0, 55, 785, 280)
  //     win.contentView.addChildView(view)

  //     console.log('Loaded URL into view2:', finalUrl)
  //   }
  // })

  ipcMain.on('dropped-data', (event, data) => {
    const webContents = event.sender

    if (!webContents || webContents.isDestroyed()) return

    if (data.type === 'text') {
      const url = data.text
      if (/^https?:\/\//.test(url)) {
        webContents.loadURL(url)
      } else {
        webContents.loadURL('data:text/plain;charset=utf-8,' + encodeURIComponent(url))
      }
    }

    if (data.type === 'files' && data.paths.length > 0) {
      const filePath = data.paths[0]
      const ext = path.extname(filePath).toLowerCase()

      if (ext === '.html' || ext === '.htm') {
        webContents.loadFile(filePath)
      } else if (ext === '.txt') {
        readFile(filePath, 'utf8', (err, content) => {
          if (err) {
            console.error('Error reading file:', err)
            return
          }
          const html = `
            <html>
              <head><meta charset="utf-8"><title>Dropped Text File</title></head>
              <body style="font-family: sans-serif; padding: 1rem; white-space: pre-wrap;">
                ${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
              </body>
            </html>`
          webContents.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
        })
      } else {
        webContents.loadURL(
          'data:text/plain;charset=utf-8,' + encodeURIComponent(`Unsupported file: ${filePath}`)
        )
      }
    }
  })
}
