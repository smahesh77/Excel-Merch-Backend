import { Transporter, createTransport } from 'nodemailer';
import SMTPPool from 'nodemailer/lib/smtp-pool';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { SMTP_HOST, SMTP_PORT } from './env';
import { logger } from './logger';
import { getOrderConfirmationHTML, getRefundConfirmationHTML, getShippingStartedHTML } from './mailTemplates';

interface MailerOpts {
	defaultFrom: string;

	pool: boolean;
	port: number;
	secure: boolean;
	host?: string;
	auth: {
		user?: string;
		pass?: string;
	};
}

class Mailer {
	private mailTransport:
		| Transporter<SMTPPool.SentMessageInfo>
		| Transporter<SMTPTransport.SentMessageInfo>;
	private defaultFrom: string;
	private connectionVerified: boolean = false;

	constructor({
		pool = true,
		host,
		port,
		secure = true,
		auth,
		defaultFrom,
	}: MailerOpts) {
		this.defaultFrom = defaultFrom || 'Excel MEC <noreply@excelmec.org>';
		if (pool) {
			this.mailTransport = createTransport({
				pool,
				host,
				port,
				secure,
				auth,
				tls: {
					ciphers: 'SSLv3',
				},
			});
		} else {
			this.mailTransport = createTransport({
				host,
				port,
				secure,
				auth,
				tls: {
					ciphers: 'SSLv3',
				},
			});
		}

		if (!auth.user || !auth.pass || !host || !port) {
			logger.warn('Mailer not configured. Emails will not be sent.');
			this.connectionVerified = false;
			return;
		}

		this.mailTransport.verify((err, success) => {
			if (err) {
				console.error(err);
			} else {
				this.connectionVerified = true;
			}
		});
	}

	async sendMail(
		to: string | string[],
		subject: string,
		html: string,
		from?: string
	) {
		if (!this.connectionVerified) {
			return false;
		}

		const mailOpts = {
			from: from || this.defaultFrom,
			to,
			subject,
			html,
		};

		return this.mailTransport.sendMail(mailOpts);
	}
}

export const mailer = new Mailer({
	defaultFrom: 'noreply@excelmec.org',
	pool: true,
	port: SMTP_PORT,
	secure: true,
	host: SMTP_HOST,
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

export async function sendOrderConfirmationMail(
	userName: string,
	totalAmt: number,
	orderId: string,
	userEmail: string
) {
	try {
		const emailHtml = await getOrderConfirmationHTML(
			userName,
			totalAmt,
			orderId
		);

		const emailSubject = `Order Confirmation`;

		return mailer.sendMail(userEmail, emailSubject, emailHtml);
	} catch (err) {
		logger.error('Error while sending order confirmation mail');
	}
}

export async function sendRefundConfirmationMail(
	userName: string,
	totalAmt: number,
	orderId: string,
	userEmail: string
) {
	try {
		const emailHtml = await getRefundConfirmationHTML(
			userName,
			totalAmt,
			orderId
		);

		const emailSubject = `Refund processed successfully`;

		return mailer.sendMail(userEmail, emailSubject, emailHtml);
	} catch (err) {
		logger.error('Error while sending refund confirmation mail');
	}
}

export async function sendShippingStartedMail(
	userName: string,
	orderId: string,
	userEmail: string,
	trackingId?: string
) {
	try {
		const emailHtml = await getShippingStartedHTML(
			userName,
			orderId,
			trackingId
		);

		const emailSubject = `Shipping Started`;

		return mailer.sendMail(userEmail, emailSubject, emailHtml);
	} catch (err) {
		logger.error('Error while sending shipping started mail');
	}
}
