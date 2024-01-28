import { Storage } from '@google-cloud/storage';
import { BUCKET_NAME, GOOGLE_CLOUD_KEY_BASE64 } from './env';
import { logger } from './logger';

const gcsKeyBuffer = Buffer.from(GOOGLE_CLOUD_KEY_BASE64, 'base64');
const gcsKey = gcsKeyBuffer.toString('utf-8');

export const storageClient = new Storage({
	credentials: JSON.parse(gcsKey),
});

export const storageBucket = storageClient.bucket(BUCKET_NAME);

setCorsPolicy();

/**
 * We set any origin to read the images from the bucket
 * Setting the origin to the frontend URL would be more secure, if needed
 * 
 * After setting the CORS policy, it takes a few minutes to hours to take effect
 * Depending on what the previous CORS policy maxAgeSeconds was set to
 */
async function setCorsPolicy() {
	try {
		const corsConfiguration = [
			{
				maxAgeSeconds: 5,
				origin: ['*'],
				method: ['GET'],
				responseHeader: ['*'],
			},
		];
		await storageBucket.setCorsConfiguration(corsConfiguration);
	} catch (err) {
		logger.error('Error setting CORS policy', {
			err: JSON.stringify(err),
		});
	}
}
