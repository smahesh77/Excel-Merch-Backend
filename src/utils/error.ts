/**
 * Object.setPrototypeOf(this, Error.prototype);
 * is set to make sure that instanceof works
 */

export class UnauthorizedError extends Error {
	constructor(message: string) {
		super(message);
		Object.setPrototypeOf(this, UnauthorizedError.prototype);
		this.name = 'UnauthorizedError';
	}
}

export class ForbiddenError extends Error {
	constructor(message: string) {
		super(message);
		Object.setPrototypeOf(this, ForbiddenError.prototype);
		this.name = 'ForbiddenError';
	}
}

export class NotFoundError extends Error {
	constructor(message: string) {
		super(message);
		Object.setPrototypeOf(this, NotFoundError.prototype);
		this.name = 'NotFoundError';
	}
}

export class BadRequestError extends Error {
	constructor(message: string) {
		super(message);
		Object.setPrototypeOf(this, BadRequestError.prototype);
		this.name = 'BadRequestError';
	}
}

export class InternalServerError extends Error {
	debug?: Object;
	constructor(message: string, debug?: Object) {
		super(message);
		Object.setPrototypeOf(this, InternalServerError.prototype);
		this.name = 'InternalServerError';
		this.debug = debug;
	}
}
