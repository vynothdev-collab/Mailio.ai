import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UploadParams {
  /** Full S3 object key, e.g. `profiles/<userId>/avatar-<ts>.png`. */
  key: string;
  buffer: Buffer;
  mimeType: string;
}

export interface UploadResult {
  key: string;
  url: string;
}

/** How long a signed GET URL stays valid. 15 minutes — long enough to render, short enough to be safe. */
const SIGNED_URL_EXPIRY_SECONDS = 60 * 15;

@Injectable()
export class S3StorageService implements OnModuleDestroy {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly publicRead: boolean;

  constructor(config: ConfigService) {
    this.region = config.get<string>('storage.region') ?? 'ap-south-1';
    this.bucket = config.get<string>('storage.bucket') ?? '';
    this.publicRead = config.get<boolean>('storage.publicRead') ?? false;

    const accessKeyId = config.get<string>('storage.accessKeyId') ?? '';
    const secretAccessKey =
      config.get<string>('storage.secretAccessKey') ?? '';

    this.client = new S3Client({
      region: this.region,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });

    if (!this.bucket) {
      this.logger.warn(
        'AWS_S3_BUCKET is not set — uploads will fail until configured.',
      );
    }
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }

  /** Whether the bucket has been configured for public reads (via bucket policy, not ACLs). */
  isPublicRead(): boolean {
    return this.publicRead;
  }

  /** Direct virtual-hosted URL. Only resolvable when the bucket policy grants public GetObject. */
  publicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Upload an object to S3.
   *
   * No `ACL` is sent on the PUT request — modern S3 buckets default to
   * "Bucket owner enforced" Object Ownership, which disables ACLs entirely
   * and rejects requests that include one. Public visibility (when desired)
   * should be granted via a bucket policy on the `profiles/*` prefix.
   *
   * `url` in the result is informational only — callers must use
   * `getSignedViewUrl(key)` for display when the bucket is private.
   */
  async uploadFile(params: UploadParams): Promise<UploadResult> {
    if (!this.bucket) {
      throw new Error('Storage bucket is not configured.');
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.buffer,
        ContentType: params.mimeType,
        CacheControl: 'private, max-age=300',
      }),
    );

    return { key: params.key, url: this.publicUrl(params.key) };
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.bucket || !key) return;
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (err) {
      this.logger.warn(
        `Failed to delete S3 object ${key}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Build a short-lived (15 minute) presigned GET URL for the given object key.
   * Use this when serving images from a private bucket.
   */
  async getSignedViewUrl(key: string): Promise<string> {
    if (!this.bucket || !key) return '';
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: SIGNED_URL_EXPIRY_SECONDS },
    );
  }

  /**
   * Short-lived presigned URL that forces the browser to download the file
   * with the supplied original filename via `Content-Disposition: attachment`.
   *
   * The filename is emitted twice for maximum browser compatibility:
   *  - `filename="…"` — ASCII fallback with quotes/CR/LF/backslash stripped.
   *  - `filename*=UTF-8''…` — RFC 5987 percent-encoded form for spaces,
   *    quotes, and any non-ASCII characters. Modern browsers prefer this one.
   */
  async getSignedDownloadUrl(key: string, filename: string): Promise<string> {
    if (!this.bucket || !key) return '';
    const safe = filename || 'download';
    // Fallback: strip everything that would break the header parser, then
    // replace anything outside printable ASCII with `_`.
    const ascii =
      safe
        .replace(/[\r\n"\\]/g, '')
        .replace(/[^\x20-\x7E]/g, '_')
        .slice(0, 200) || 'download';
    // RFC 5987: percent-encode so spaces, accents, emoji etc. survive.
    const encoded = encodeURIComponent(safe);
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`,
      }),
      { expiresIn: SIGNED_URL_EXPIRY_SECONDS },
    );
  }
}
