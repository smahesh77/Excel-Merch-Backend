import { NextFunction, Request, Response, RequestHandler } from 'express';
import { ValidationChain, validationResult } from 'express-validator';

export function getValidator(
	validationChain: (ValidationChain | RequestHandler)[]
) {
	return [
		...validationChain,
		(req: Request, res: Response, next: NextFunction) => {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() });
			}

			next();
		},
	];
}
