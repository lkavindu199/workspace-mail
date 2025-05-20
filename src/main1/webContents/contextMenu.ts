import { Menu, MenuItem, WebContents, ContextMenuParams } from 'electron';

export class ContextMenuService {
  createContextMenu(webContents: WebContents, params: ContextMenuParams): Menu {
    const menu = new Menu();

    // Spellcheck suggestions
    if (params.misspelledWord) {
      this.addSpellcheckItems(menu, webContents, params);
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // Edit operations
    if (params.selectionText?.trim()) {
      menu.append(new MenuItem({ role: 'copy', label: 'Copy' }));
    }

    if (params.isEditable) {
      menu.append(new MenuItem({ role: 'cut', label: 'Cut' }));
      menu.append(new MenuItem({ role: 'paste', label: 'Paste' }));
    }

    if (params.selectionText || params.isEditable) {
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // Select All and DevTools
    menu.append(new MenuItem({ role: 'selectAll', label: 'Select All' }));
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(this.createDevToolsMenuItem(webContents));

    return menu;
  }

  // ... helper methods ...
}
