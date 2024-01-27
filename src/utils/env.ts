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

if (!process.env.RAZORPAY_KEY_ID) {
	console.error('fatal: RAZORPAY_KEY_ID not set in env');
	process.exit(1);
}
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;

if (!process.env.RAZORPAY_KEY_SECRET) {
	console.error('fatal: RAZORPAY_KEY_SECRET not set in env');
	process.exit(1);
}
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!process.env.RAZORPAY_TRANSFER_ACC_ID) {
	console.log(
		'RAZORPAY_TRANSFER_ACC_ID not set in env, the orders will not include a transfer and will be directly credited to the merchant'
	);
}

export const RAZORPAY_TRANSFER_ACC_ID = process.env.RAZORPAY_TRANSFER_ACC_ID;

if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
	console.error('fatal: RAZORPAY_WEBHOOK_SECRET not set in env');
	process.exit(1);
}

export const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

if (
	!process.env.WITH_LOCAL_TUNNEL ||
	process.env.WITH_LOCAL_TUNNEL !== 'true'
) {
	console.log(`WITH_LOCAL_TUNNEL not set to 'true', defaulting to false`);
	console.log('This Means that the webhook will not work unless publically accessible');
}

export const WITH_LOCAL_TUNNEL = process.env.WITH_LOCAL_TUNNEL === 'true';

if (!process.env.NODE_ENV) {
	console.log('NODE_ENV not set in env, defaulting to production');
}

export const NODE_ENV = process.env.NODE_ENV || 'production';

if (
	!process.env.SMTP_USER ||
	!process.env.SMTP_PASS ||
	!process.env.SMTP_HOST
) {
	console.warn(
		'One or more of SMTP_USER, SMTP_PASS, SMTP_HOST not set in env, email functionality will not work'
	);
}
if (!process.env.SMTP_PORT) {
	console.log('SMTP_PORT not set in env, defaulting to 465');
	console.log(
		'If you get an error, try setting it to 587 or refer email server docs'
	);
}
if (!process.env.SMTP_FROM) {
	console.log(
		'SMTP_FROM not set in env, defaulting to "Excel Merch <noreply@excelmec.org>"'
	);
}

if (!process.env.SMTP_TO) {
	console.log('SMTP_TO not set in env, defaulting to cstech@excelmec.org');
}
export const SMTP_USER = process.env.SMTP_USER;
export const SMTP_PASS = process.env.SMTP_PASS;
export const SMTP_HOST = process.env.SMTP_HOST;
export const SMTP_FROM =
	process.env.SMTP_FROM || 'Excel Merch <noreply@excelmec.org>';
export const SMTP_TO = process.env.SMTP_TO || 'cstech@excelmec.org'
export const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
