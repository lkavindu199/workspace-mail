import Store from 'electron-store';
import { StorageLocation, Tab } from './types';

export class AppStore {
  private store: Store;

  constructor() {
    this.store = new Store({
      defaults: {
        tabs: [] as Tab[],
        autoUpdate: true,
        storageLocation: '',
        activeTab: null
      }
    });
  }

  // Tabs
  getTabs(): Tab[] {
    return this.store.get('tabs', []);
  }

  saveTabs(tabs: Tab[]): void {
    this.store.set('tabs', tabs);
  }

  // Auto-update
  getAutoUpdate(): boolean {
    return this.store.get('autoUpdate', true);
  }

  setAutoUpdate(enabled: boolean): void {
    this.store.set('autoUpdate', enabled);
  }

  // Storage location
  getStorageLocation(defaultPath: string): string {
    return this.store.get('storageLocation', defaultPath);
  }

  setStorageLocation(location: string): void {
    this.store.set('storageLocation', location);
  }

  // Active tab
  getActiveTab(): string | null {
    return this.store.get('activeTab', null);
  }

  setActiveTab(id: string): void {
    this.store.set('activeTab', id);
  }

  // Clear store
  clear(): void {
    this.store.clear();
  }
}

export const appStore = new AppStore();
