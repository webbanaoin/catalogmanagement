export interface CreateUploadUrlInput {
  key: string;
  contentType: string;
  contentLength: number;
  expiresInSeconds?: number;
}

export interface CreateUploadUrlResult {
  url: string;
  key: string;
  expiresInSeconds: number;
  headers: Readonly<Record<string, string>>;
}

export interface StorageService {
  createUploadUrl(input: CreateUploadUrlInput): Promise<CreateUploadUrlResult>;
  deleteObject(key: string): Promise<void>;
  getMediaUrl(key: string): Promise<string>;
}
