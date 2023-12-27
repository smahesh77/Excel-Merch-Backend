import { Storage } from '@google-cloud/storage';
import { BUCKET_NAME, GOOGLE_CLOUD_KEY_BASE64 } from './env';

const gcsKeyBuffer = Buffer.from(GOOGLE_CLOUD_KEY_BASE64, 'base64');
const gcsKey = gcsKeyBuffer.toString('utf-8');

export const storageClient = new Storage({
	credentials: JSON.parse(gcsKey),
});

export const storageBucket = storageClient.bucket(BUCKET_NAME);
