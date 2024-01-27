import { ErrorRequestHandler } from 'express';
import {
	UnauthorizedError,
	BadRequestError,
	ForbiddenError,
	NotFoundError,
	InternalServerError,
} from '../utils/error';
import { logger } from '../utils/logger';

export const errorHandler: ErrorRequestHandler = function (
	err,
	req,
	res,
	next
) {
	if (err instanceof BadRequestError)
		return res.status(400).json({ error: err.message });
	else if (err instanceof UnauthorizedError)
		return res.status(401).json({ error: err.message });
	else if (err instanceof ForbiddenError)
		return res.status(403).json({ error: err.message });
	else if (err instanceof NotFoundError)
		return res.status(404).json({ error: err.message });
	else if (err instanceof InternalServerError) {
		logger.error(err.message, {
			message: err.message,
			stack: err.stack,
			err: JSON.stringify(err),
			debug: JSON.stringify(err.debug),
		});
		return res.status(500).json({ error: err.message });
	} else {
		logger.error(err.message, {
			message: err.message,
			stack: err.stack,
			err: JSON.stringify(err),
		});
		return res.status(500).json({ error: 'Internal Server Error' });
	}
};

export const jsonParseErrHandler: ErrorRequestHandler = function (
	err,
	req,
	res,
	next
) {
	// This check makes sure this is a JSON parsing issue, but it might be
	// coming from any middleware, not just body-parser:
	if (err instanceof SyntaxError && 'body' in err) {
		throw new BadRequestError("Invalid JSON");
	}

	return next();
};
