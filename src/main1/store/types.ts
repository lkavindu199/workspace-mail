export interface Tab {
  id: string;
  url?: string;
  username?: string;
  password?: string;
}

export interface StorageLocation {
  path: string;
  lastSelected: Date;
}
