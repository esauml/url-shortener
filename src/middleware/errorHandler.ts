import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/errors/AppError';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { config } from '@/config';

/**
 * Global error handling middleware
 * Must be registered after all routes in app.ts
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Get request ID and logger from pino-http middleware
  const requestId = req.id || 'unknown';
  const workerId = config.workerId;
  const log = (req as any).log || console;

  // Handle known operational errors
  if (err instanceof AppError) {
    log.error({
      err: { name: err.constructor.name, message: err.message, statusCode: err.statusCode },
      requestId,
      workerId,
    }, `${err.constructor.name}: ${err.message}`);
    
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
        requestId,
      },
    });
    return;
  }

  // Handle malformed JSON payloads
  if (
    err instanceof SyntaxError &&
    (err as any).type === 'entity.parse.failed'
  ) {
    log.error({
      err: { name: 'SyntaxError', message: err.message, type: 'entity.parse.failed' },
      requestId,
      workerId,
    }, 'JSON parse error');
    res.status(400).json({
      error: {
        message: 'Invalid JSON payload',
        statusCode: 400,
        requestId,
      },
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    log.error({
      err: { name: 'PrismaClientKnownRequestError', message: err.message, code: err.code, meta: err.meta },
      requestId,
      workerId,
    }, `Prisma error ${err.code}`);

    // P2002: Unique constraint violation
    if (err.code === 'P2002') {
      res.status(409).json({
        error: {
          message: 'A record with this identifier already exists',
          statusCode: 409,
          requestId,
        },
      });
      return;
    }

    // P2025: Record not found
    if (err.code === 'P2025') {
      res.status(404).json({
        error: {
          message: 'Resource not found',
          statusCode: 404,
          requestId,
        },
      });
      return;
    }

    // Other Prisma errors as 500
    res.status(500).json({
      error: {
        message: 'Database operation failed',
        statusCode: 500,
        requestId,
      },
    });
    return;
  }

  // Handle Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    log.error({
      err: { name: 'PrismaClientValidationError', message: err.message },
      requestId,
      workerId,
    }, 'Prisma validation error');
    res.status(400).json({
      error: {
        message: 'Invalid data provided',
        statusCode: 400,
        requestId,
      },
    });
    return;
  }

  // Handle unexpected errors
  log.error({
    err: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    requestId,
    workerId,
  }, 'Unexpected error');

  res.status(500).json({
    error: {
      message: 'An unexpected error occurred',
      statusCode: 500,
      requestId,
    },
  });
};

/**
 * @deprecated Use requestLogger from @/middleware/requestLogger instead
 * Middleware to add a unique request ID to each request
 * Should be registered before routes in app.ts
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate simple request ID (UUID)
  (req as any).id = randomUUID();
  next();
};
