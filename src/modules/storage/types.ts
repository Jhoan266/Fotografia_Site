import type { Readable } from "stream";

export type StorageObject = {
  key: string;
  size: number;
};

export interface StorageProvider {
  put(key: string, data: Buffer): Promise<StorageObject>;
  get(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  openReadStream(key: string): Promise<Readable> | Readable;
}

export type StoredPhoto = {
  storageKey: string;
  thumbKey: string;
  width: number;
  height: number;
};
