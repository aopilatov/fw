export class ForbiddenError extends Error {}

export class HttpResponseError extends Error {
	constructor(message: string, options?: { cause?: Error | unknown }) {
		super(message, options);
	}
}

export class BadRequestError extends HttpResponseError {
	constructor(message: string, options?: { cause?: Error | unknown }) {
		super(message, options);
	}
}

export class NotFoundError extends HttpResponseError {
	constructor(message: string, options?: { cause?: Error | unknown }) {
		super(message, options);
	}
}

export class UnauthorizedError extends HttpResponseError {
	constructor(message: string, options?: { cause?: Error | unknown }) {
		super(message, options);
	}
}

export class AccessDeniedError extends HttpResponseError {
	constructor(message: string, options?: { cause?: Error | unknown }) {
		super(message, options);
	}
}

export class TokenError extends HttpResponseError {
	constructor(message: string, options?: { cause?: Error | unknown }) {
		super(message, options);
	}
}

export class ServiceUnavailableError extends HttpResponseError {
	constructor(message: string, options?: { cause?: Error | unknown }) {
		super(message, options);
	}
}

export class NotAcceptableError extends HttpResponseError {
	constructor(message: string, options?: { cause?: Error | unknown }) {
		super(message, options);
	}
}
