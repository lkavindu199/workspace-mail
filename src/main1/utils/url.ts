import path from 'path';
import { app } from 'electron';

export function getRendererUrl(route = ''): string {
  const queryString = route ? `#/${route}` : '';
  if (app.isPackaged) {
    return `file://${path.join(__dirname, '../../renderer/index.html')}${queryString}`;
  }
  return `http://localhost:5173/${queryString}`;
}

export function isInternalURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'squareworkspace.com' ||
           parsed.hostname.endsWith('.squareworkspace.com');
  } catch {
    return false;
  }
}
