import { app } from 'electron'
import { WindowManager } from './modules/Windows/windowManager'
import { attachContextMenu } from './modules/WebView/webcontentManager'

app.whenReady().then(() => {
  // app.setAsDefaultProtocolClient('mailto')
  const winManager = WindowManager.getInstance()
  const win = winManager.win

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
  app.on('web-contents-created', (_, contents) => {
    attachContextMenu(contents)
  })
})
