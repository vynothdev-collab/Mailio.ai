import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  region: process.env.AWS_REGION ?? 'ap-south-1',
  bucket: process.env.AWS_S3_BUCKET ?? '',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  publicRead:
    (process.env.STORAGE_PUBLIC_READ ?? 'false').toLowerCase() === 'true',
}));
