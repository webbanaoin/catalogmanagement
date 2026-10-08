import "server-only";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getStorageEnvironment, type StorageEnvironment } from "@/server/env";

import type { CreateUploadUrlInput, CreateUploadUrlResult, StorageService } from "./types";

const DEFAULT_UPLOAD_EXPIRY_SECONDS = 5 * 60;
const DEFAULT_READ_EXPIRY_SECONDS = 15 * 60;

export class S3StorageService implements StorageService {
  private readonly client: S3Client;

  constructor(private readonly config: StorageEnvironment = getStorageEnvironment()) {
    this.client = new S3Client({
      region: config.AWS_REGION,
      ...(config.AWS_S3_ENDPOINT ? { endpoint: config.AWS_S3_ENDPOINT } : {}),
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async createUploadUrl(input: CreateUploadUrlInput): Promise<CreateUploadUrlResult> {
    const expiresInSeconds = input.expiresInSeconds ?? DEFAULT_UPLOAD_EXPIRY_SECONDS;
    const command = new PutObjectCommand({
      Bucket: this.config.AWS_S3_BUCKET,
      Key: input.key,
      ContentType: input.contentType,
      ContentLength: input.contentLength,
      CacheControl: "public, max-age=31536000, immutable",
    });

    return {
      url: await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds }),
      key: input.key,
      expiresInSeconds,
      headers: {
        "Content-Type": input.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    };
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.AWS_S3_BUCKET, Key: key }),
    );
  }

  async getMediaUrl(key: string): Promise<string> {
    if (this.config.MEDIA_BASE_URL) {
      return `${this.config.MEDIA_BASE_URL.replace(/\/$/, "")}/${encodeStorageKey(key)}`;
    }

    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.config.AWS_S3_BUCKET, Key: key }),
      { expiresIn: DEFAULT_READ_EXPIRY_SECONDS },
    );
  }
}

function encodeStorageKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}
