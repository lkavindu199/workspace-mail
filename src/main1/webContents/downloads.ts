import { session, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { appStore } from '../../store';
import * as Sentry from '@sentry/electron/main';

export class DownloadService {
  private handledSessions = new Set<Electron.Session>();

  setupDownloads(session: Electron.Session): void {
    if (this.handledSessions.has(session)) return;
    this.handledSessions.add(session);

    session.on('will-download', (_, item) => {
      const storageLocation = appStore.getStorageLocation(app.getPath('downloads'));
      const savePath = path.join(storageLocation, item.getFilename());

      console.log(`Downloading ${item.getFilename()} to ${savePath}`);
      item.setSavePath(savePath);

      item.on('done', async (_, state) => {
        if (state === 'completed') {
          await this.handleDownloadCompletion(savePath);
        } else {
          console.warn(`Download not completed. State: ${state}`);
        }
      });
    });
  }

  private async handleDownloadCompletion(savePath: string): Promise<void> {
    const isFileReady = (): boolean => {
      try {
        const stats = fs.statSync(savePath);
        return stats.size > 0;
      } catch {
        return false;
      }
    };

    // Wait for file to be fully ready (max 2 seconds)
    let attempts = 0;
    while (!isFileReady() && attempts < 20) {
      await new Promise((res) => setTimeout(res, 100));
      attempts++;
    }

    if (isFileReady()) {
      try {
        const result = await shell.openPath(savePath);
        if (result) {
          console.log(`Failed to open file: ${result}`);
        }
      } catch (err) {
        Sentry.captureException(err);
        console.log('Error opening file:', err);
      }
    } else {
      console.log('File not ready after timeout, not opening.');
    }
  }
}
