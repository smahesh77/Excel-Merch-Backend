import {
	createLogger,
	format,
	transports,
	Logger as Winstonlogger,
} from 'winston';
import { WinstonMailTransport } from './winstonMailTransport';

import {
	NODE_ENV,
	SMTP_FROM,
	SMTP_HOST,
	SMTP_PASS,
	SMTP_PORT,
	SMTP_TO,
	SMTP_USER,
} from './env';

const customLevels = {
	levels: {
		error: 0,
		alert: 1,
		notice: 2,
		warn: 3,
		info: 4,
	},
	colors: {
		error: 'red',
		alert: 'red',
		notice: 'yellow',
		warn: 'blue',
		info: 'green',
	},
};

enum gcpLevels {
	DEFAULT = 0,
	DEBUG = 100,
	INFO = 200,
	NOTICE = 300,
	WARNING = 400,
	ERROR = 500,
	CRITICAL = 600,
	ALERT = 700,
	EMERGENCY = 800,
}
const commonFormat = format.combine(
	format.json({ space: 2 }),
	format.metadata({
		fillExcept: ['message', 'level', 'timestamp', 'label', 'severity'],
	})
);

function customConsoleLogFormat() {
	if (NODE_ENV === 'development') {
		return format.combine(
			commonFormat,
			format.colorize({
				colors: customLevels.colors,
			}),
			format.printf((info) => {
				const metadata = info?.metadata;
				return `[${info.timestamp}][${info.level}]: ${info.message} ${
					metadata && Object.keys(metadata)?.length > 0
						? '\n' + JSON.stringify(metadata, null, 2)
						: ''
				}`;
			})
		);
	} else {
		console.log(
			'Set NODE_ENV to development to get pretty logs during development'
		);
		return format.combine(commonFormat);
	}
}

type keyValuePair = {
	[key: string]: string | number | boolean | keyValuePair;
};

class Logger {
	winstonLogger: Winstonlogger;

	constructor() {
		const customFormat = customConsoleLogFormat();
		this.winstonLogger = createLogger({
			levels: customLevels.levels,
			format: format.timestamp(),
			transports: [
				// new transports.File({ filename: 'logs/error.log', level: 'error' }),
				// new transports.File({ filename: 'logs/combined.log' }),

				new transports.Console({
					format: customFormat,
				}),
			],
		});

		if (SMTP_USER && SMTP_PASS && SMTP_HOST) {
			this.winstonLogger.add(
				new WinstonMailTransport({
					from: SMTP_FROM,
					to: SMTP_TO,
					subject: '{{level}}: {{message}}',

					/**
					 * All levels above notice are sent email,
					 * severity is higher for lower numbers
					 * so, error, alert, notice are sent email
					 */
					level: 'notice',
					format: commonFormat,

					pool: true,
					host: SMTP_HOST,
					port: SMTP_PORT,
					secure: true,
					auth: {
						user: SMTP_USER,
						pass: SMTP_PASS,
					},
				})
			);
		}
	}

	/**
	 * severity is added to the metadata to be used by the GCP logging agent
	 */

	/**
	 * This will result in an email being sent to admin
	 */
	error(message: string, meta?: keyValuePair) {
		this.winstonLogger.error(message, {
			severity: gcpLevels.ERROR,
			...meta,
		});
	}

	/**
	 * This will result in an email being sent to admin
	 */
	alert(message: string, meta?: keyValuePair) {
		this.winstonLogger.alert(message, {
			severity: gcpLevels.ALERT,
			...meta,
		});
	}

	/**
	 * This will result in an email being sent to admin
	 */
	notice(message: string, meta?: keyValuePair) {
		this.winstonLogger.notice(message, {
			severity: gcpLevels.NOTICE,
			...meta,
		});
	}

	warn(message: string, meta?: keyValuePair) {
		this.winstonLogger.warn(message, {
			severity: gcpLevels.WARNING,
			...meta,
		});
	}

	info(message: string, meta?: keyValuePair) {
		this.winstonLogger.info(message, {
			severity: gcpLevels.INFO,
			...meta,
		});
	}
}

export const logger = new Logger();
