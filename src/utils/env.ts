import dotenv from 'dotenv';

dotenv.config();

if (!process.env.PORT) {
	console.log('PORT not set in env, using default 4000');
}
export const PORT = parseInt(process.env.PORT || '4000');

if (!process.env.JWT_SECRET_KEY) {
	console.error('fatal: JWT_SECRET_KEY not set in env');
	process.exit(1);
}
export const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

if (!process.env.DATABASE_URL) {
	console.error('fatal: DATABASE_URL not set in env');
	process.exit(1);
}
export const DATABASE_URL = process.env.DATABASE_URL;

if (!process.env.GOOGLE_CLOUD_KEY_BASE64) {
	console.error('fatal: GOOGLE_CLOUD_KEY_BASE64 not set in env');
	process.exit(1);
}
export const GOOGLE_CLOUD_KEY_BASE64 = process.env.GOOGLE_CLOUD_KEY_BASE64;

if (!process.env.BUCKET_NAME) {
	console.error('fatal: BUCKET_NAME not set in env');
	process.exit(1);
}
export const BUCKET_NAME = process.env.BUCKET_NAME;


