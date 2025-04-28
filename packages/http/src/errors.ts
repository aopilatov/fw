export class ForbiddenError extends Error {}

export class HttpResponseError extends Error {
	constructor(message: string, options?: { cause?: Error | unknown }) {
		super(message, options);
	}
}

export class BadRequestError extends HttpResponseError {
	public readonly name: string = 'BadRequestError';
	public readonly statusCode: number = 400;

	constructor(message: string, options?: { cause?: Error | unknown }) {
		super(message, options);
	}
}

export class NotFoundError extends HttpResponseError {
	public readonly name: string = 'NotFoundError';
	public readonly statusCode: number = 404;

	constructor(message: string, options?: { cause?: Error | unknown }) {
		super(message, options);
	}
}

export class UnauthorizedError extends HttpResponseError {
	public readonly name: string = 'UnauthorizedError';
	public readonly statusCode: number = 401;

	constructor(message: string, options?: { cause?: Error | unknown }) {
		super(message, options);
	}
}

export class AccessDeniedError extends HttpResponseError {
	public readonly name: string = 'AccessDeniedError';
	public readonly statusCode: number = 401;

	constructor(message: string, options?: { cause?: Error | unknown }) {
		super(message, options);
	}
}

export class TokenError extends HttpResponseError {
	public readonly name: string = 'TokenError';
	public readonly statusCode: number = 401;

	constructor(message: string, options?: { cause?: Error | unknown }) {
		super(message, options);
	}
}

export class ServiceUnavailableError extends HttpResponseError {
	public readonly name: string = 'ServiceUnavailableError';
	public readonly statusCode: number = 503;

	constructor(message: string, options?: { cause?: Error | unknown }) {
		super(message, options);
	}
}

export class NotAcceptableError extends HttpResponseError {
	public readonly name: string = 'NotAcceptableError';
	public readonly statusCode: number = 406;

	constructor(message: string, options?: { cause?: Error | unknown }) {
		super(message, options);
	}
}
