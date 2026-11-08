export type StorageObject = {
  key: string;
  size: number;
};

export interface StorageProvider {
  put(key: string, data: Buffer): Promise<StorageObject>;
  get(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  resolveLocalPath?(key: string): string;
}

export type StoredPhoto = {
  storageKey: string;
  thumbKey: string;
  width: number;
  height: number;
};
