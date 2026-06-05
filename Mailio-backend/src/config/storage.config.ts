import { registerAs } from '@nestjs/config';

/**
 * Object storage (AWS S3) configuration.
 *
 * Security model:
 *   The bucket is treated as PRIVATE by default. We never set an `ACL` on
 *   uploads (modern buckets enforce "Bucket owner enforced" ownership which
 *   rejects ACL writes anyway). The backend serves images by generating
 *   short-lived presigned GET URLs from the stored `profile_image_key`.
 *
 *   Set `STORAGE_PUBLIC_READ=true` only if you have separately granted
 *   public `s3:GetObject` on the avatar prefix via a bucket policy or
 *   CloudFront distribution; that lets the backend return the static
 *   `profileImageUrl` directly instead of signing every read.
 */
export default registerAs('storage', () => ({
  region: process.env.AWS_REGION ?? 'ap-south-1',
  bucket: process.env.AWS_S3_BUCKET ?? '',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  publicRead:
    (process.env.STORAGE_PUBLIC_READ ?? 'false').toLowerCase() === 'true',
}));
