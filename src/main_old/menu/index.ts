import { Menu, shell } from 'electron';
import { exec } from 'child_process';

export function createAppMenu(createAboutWindow: () => void, createSettingsWindow: () => void, getStorageLocation: () => string): void {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'About Workspace Mail', click: createAboutWindow },
        { label: 'Settings', click: createSettingsWindow },
        {
          label: 'Attachments',
          click: () => {
            const location = getStorageLocation();
            shell.openPath(location).then((result) => {
              if (result) console.error('Failed to open folder:', result);
            });
          },
        },
        { type: 'separator' },
        { role: isMac ? 'close' : 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Office',
      click: () => {
        exec('"C:\\Program Files\\ONLYOFFICE\\DesktopEditors\\DesktopEditors.exe"', (err) => {
          if (err) console.error('OnlyOffice failed to launch:', err);
        });
      },
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Support',
          click: () => {
            shell.openExternal('https://support.squareworkspace.com');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
