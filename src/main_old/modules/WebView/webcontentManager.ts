import {
  BrowserWindow,
  Menu,
  MenuItem,
  WebContents,
  session,
  shell,
  ContextMenuParams,
} from 'electron'


export const createContextMenu = (
  webContents: WebContents,
  params: ContextMenuParams
): Menu => {
  const menu = new Menu()

  if (params.misspelledWord) {
    if (params.dictionarySuggestions.length > 0) {
      for (const suggestion of params.dictionarySuggestions) {
        menu.append(
          new MenuItem({
            label: suggestion,
            click: () => webContents.replaceMisspelling(suggestion),
          })
        )
      }
    } else {
      menu.append(
        new MenuItem({
          label: 'No suggestions',
          enabled: false
        })
      )
    }
    menu.append(new MenuItem({ type: 'separator' }))
  }

  menu.append(new MenuItem({ role: 'cut', label: 'Cut' }))
  menu.append(new MenuItem({ role: 'copy', label: 'Copy' }))
  menu.append(new MenuItem({ role: 'paste', label: 'Paste' }))
  menu.append(new MenuItem({ type: 'separator' }))
  menu.append(new MenuItem({ role: 'selectAll', label: 'Select All' }))

  return menu
}

export const attachContextMenu = (webContents: WebContents): void => {
  webContents.on('context-menu', (_event, params) => {
    const menu = createContextMenu(webContents, params)
    menu.popup({
      window: BrowserWindow.fromWebContents(webContents) ?? undefined,
      x: params.x,
      y: params.y,
    })
  })


  try {
    webContents.session.setSpellCheckerLanguages(['en-US', 'en-GB'])
    webContents.session.setSpellCheckerEnabled(true)
  } catch (err) {
    console.error('Spellchecker error:', err)
  }
}

export const isInternalURL = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    const isInternal = parsed.hostname === 'squareworkspace.com' || parsed.hostname.endsWith('.squareworkspace.com')
    console.log('[isInternalURL]', url, '=>', isInternal)
    return isInternal
  } catch (error) {
    console.error('Failed to parse URL:', url, error)
    return false
  }
}

export const handleExternalLinks = (webContents: WebContents): void => {
  webContents.on('will-navigate', (event, url) => {
    if (!isInternalURL(url)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  webContents.setWindowOpenHandler(({ url }) => {
    if (!isInternalURL(url)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })
}
