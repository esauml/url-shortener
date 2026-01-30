/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown (V8 only)
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * 400 Bad Request - For validation errors and invalid input
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed') {
    super(message, 400);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 404 Not Found - For resource not found errors
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 500 Internal Server Error - For database errors
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', isOperational = true) {
    super(message, 500, isOperational);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * 500 Internal Server Error - For cache errors
 * Non-operational by default as cache failures may indicate infrastructure issues
 */
export class CacheError extends AppError {
  constructor(message: string = 'Cache operation failed', isOperational = false) {
    super(message, 500, isOperational);
    Object.setPrototypeOf(this, CacheError.prototype);
  }
}
