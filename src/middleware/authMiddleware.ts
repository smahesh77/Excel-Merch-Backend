import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { DecodedToken } from '../types';
import { JWT_SECRET_KEY } from '../utils/env';
import {
	ForbiddenError,
	InternalServerError,
	UnauthorizedError,
} from '../utils/error';

export function isAuthenticated(
	req: Request,
	res: Response,
	next: NextFunction
) {
	const authorizationHeader = req.headers.authorization;
	if (!authorizationHeader) {
		throw new UnauthorizedError('Missing authorization header');
	}

	const tokenParts = authorizationHeader.split(' ');
	if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
		throw new UnauthorizedError('Invalid authorization header format');
	}

	const token = tokenParts[1];
	try {
		const decodedToken = jwt.verify(token, JWT_SECRET_KEY) as Omit<
			DecodedToken,
			'user_id'
		> & { user_id: string };
		req.decodedToken = {
			...decodedToken,
			user_id: parseInt(decodedToken.user_id),
		};
		next();
	} catch (err) {
		if (err instanceof TokenExpiredError) {
			throw new UnauthorizedError('Token expired');
		}

		throw new UnauthorizedError('Invalid token');
	}
}

/**
 * This middleware must be used after isAuthenticated middleware
 */
export function isMerchAdmin(req: Request, res: Response, next: NextFunction) {
	if (!req.decodedToken) {
		throw new InternalServerError('No decoded user token found');
	}

	const allowedRoles = ['Admin', 'MerchManage'];

	if (!req.decodedToken.role) {
		throw new ForbiddenError(
			'Your role is not allowed to access this route'
		);
	}

	if (typeof req.decodedToken.role === 'string') {
		if (!allowedRoles.includes(req.decodedToken.role)) {
			throw new ForbiddenError(
				'Your role is not allowed to access this route'
			);
		} else {
			return next();
		}
	}
	const incomingRoles = req.decodedToken.role;

	if (!req.decodedToken.role.some((role) => allowedRoles.includes(role))) {
		throw new ForbiddenError(
			'Your role is not allowed to access this route'
		);
	}

	return next();
}

/**
 * This middleware must be used after isAuthenticated middleware
 */
export function isMerchOrderManager(req: Request, res: Response, next: NextFunction) {
	if (!req.decodedToken) {
		throw new InternalServerError('No decoded user token found');
	}

	const allowedRoles = ['Admin', 'MerchManage', 'MerchOrderManage'];

	if (!req.decodedToken.role) {
		throw new ForbiddenError(
			'Your role is not allowed to access this route'
		);
	}

	if (typeof req.decodedToken.role === 'string') {
		if (!allowedRoles.includes(req.decodedToken.role)) {
			throw new ForbiddenError(
				'Your role is not allowed to access this route'
			);
		} else {
			return next();
		}
	}

	if (!req.decodedToken.role.some((role) => allowedRoles.includes(role))) {
		throw new ForbiddenError(
			'Your role is not allowed to access this route'
		);
	}

	return next();
}


