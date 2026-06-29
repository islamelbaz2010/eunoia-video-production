export interface StorageObject {
  key: string;
  size: number;
  lastModified: Date;
  contentType: string;
}

export interface IStorageProvider {
  readonly name: string;
  upload(key: string, data: Buffer, contentType: string): Promise<StorageObject>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix?: string): Promise<StorageObject[]>;
}
