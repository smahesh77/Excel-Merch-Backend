import Transport from 'winston-transport';
import { Format } from 'logform';
import { Transporter, createTransport } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import SMTPPool from 'nodemailer/lib/smtp-pool';
import { render } from 'mustache';

interface WinstonMailTransportOpts {
	to: string;
	from: string;
	ccAddressess?: string[];
	subject: string;

	level: string;
	format: Format;

	pool: boolean;
	host: string;
	port: number;
	secure: boolean;
	auth: {
		user: string;
		pass: string;
	};
}

export class WinstonMailTransport extends Transport {
	private mailTransport:
		| Transporter<SMTPTransport.SentMessageInfo>
		| Transporter<SMTPPool.SentMessageInfo>;
	private transportOpts: WinstonMailTransportOpts;
	private connectionVerified: boolean = false;

	/**
	 * @param subject must be a mustache template string
	 */
	constructor({
		to,
		from,
		ccAddressess,
		subject = '{{level}}: {{message}}',

		level,
		format,

		pool = true,
		host,
		port,
		secure = true,
		auth,
	}: WinstonMailTransportOpts) {
		super({
			level,
			format,
		});

		this.transportOpts = {
			to,
			from,
			ccAddressess,
			subject,

			level,
			format,

			pool,
			host,
			port,
			secure,
			auth,
		};

		if (pool) {
			this.mailTransport = createTransport({
				pool: true,
				host,
				port,
				secure,
				auth,
				tls: {
					ciphers: 'SSLv3',
				},
			}) as Transporter<SMTPPool.SentMessageInfo>;
		} else {
			this.mailTransport = createTransport({
				host,
				port,
				secure,
				auth,
				tls: {
					ciphers: 'SSLv3',
				},
			}) as Transporter<SMTPTransport.SentMessageInfo>;
		}

		this.connectionVerified = true;
		// Ignoring this as occasionally connections issues might occur
		// and we can still attempt to send emails
		// errors while sending emails should be handled separately
		// this.mailTransport.verify((err, success) => {
		// 	if (err) {
		// 		console.log('error verifying mail transport');
		// 		console.error(err);
		// 	} else {
		// 		this.connectionVerified = true;
		// 	}
		// });
	}

	async log(info: any, callback: any) {
		const { level, message, ...meta } = info;

		if (!this.connectionVerified) {
			return callback(null, false);
		}

		const renderedSubject = render(this.transportOpts.subject, {
			level,
			message,
			...meta,
		});

		await this.mailTransport.sendMail({
			to: this.transportOpts.to,
			from: this.transportOpts.from,
			cc: this.transportOpts.ccAddressess,
			subject: renderedSubject,
			text: `${level}: ${message}\n\n${JSON.stringify(info, null, 2)}`,
		});

		return callback(null, true);
	}
}
