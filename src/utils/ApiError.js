export class ApiError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {{ code?: string, details?: unknown, isOperational?: boolean, cause?: unknown }} [options]
   */
  constructor(statusCode, message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = options.code ?? ApiError.defaultCode(statusCode);
    this.details = options.details ?? null;
    this.isOperational = options.isOperational ?? true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static defaultCode(statusCode) {
    switch (statusCode) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      case 429:
        return 'RATE_LIMIT_EXCEEDED';
      default:
        return statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR';
    }
  }

  static badRequest(message, details) {
    return new ApiError(400, message, { code: 'BAD_REQUEST', details });
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message, { code: 'UNAUTHORIZED' });
  }

  static forbidden(message = 'Insufficient permissions') {
    return new ApiError(403, message, { code: 'FORBIDDEN' });
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, { code: 'NOT_FOUND' });
  }

  static conflict(message, details) {
    return new ApiError(409, message, { code: 'CONFLICT', details });
  }

  static validation(message = 'Validation failed', details) {
    return new ApiError(400, message, { code: 'VALIDATION_ERROR', details });
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message, { code: 'RATE_LIMIT_EXCEEDED' });
  }

  static internal(message = 'Unexpected server error', cause) {
    return new ApiError(500, message, {
      code: 'INTERNAL_SERVER_ERROR',
      isOperational: false,
      cause,
    });
  }
}
