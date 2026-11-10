import type { Readable } from "stream";

export type StorageObject = {
  key: string;
  size: number;
};

export interface StorageProvider {
  put(key: string, data: Buffer): Promise<StorageObject>;
  get(key: string): Promise<Buffer>;
  size(key: string, signal?: AbortSignal): Promise<number | null>;
  delete(key: string): Promise<void>;
  openReadStream(key: string, signal?: AbortSignal): Promise<Readable> | Readable;
}

export type StoredPhoto = {
  storageKey: string;
  thumbKey: string;
  width: number;
  height: number;
};
