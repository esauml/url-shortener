import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/errors/AppError';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { config } from '@/config';
import { logger } from '@/logger';
import { logError } from '@/utils/loggerHelpers';

/**
 * Global error handling middleware
 * Must be registered after all routes in app.ts
 * Uses structured error context for consistent error logging
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Get request ID from pino-http middleware, fallback to base logger if unavailable
  const requestId = req.id || 'unknown';
  const workerId = config.workerId;

  // Use request-scoped logger if available, otherwise fallback to base logger
  // This ensures we have a logger even if middleware is misconfigured
  const requestLog = req.log || logger.child({ requestId, workerId });

  // Handle known operational errors
  if (err instanceof AppError) {
    logError(requestLog, err, {
      category: 'user',
      code: err.constructor.name,
      statusCode: err.statusCode,
      message: err.message,
    });
    
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
    logError(requestLog, err, {
      category: 'user',
      code: 'INVALID_JSON',
      statusCode: 400,
      message: 'Invalid JSON payload',
      context: { bodyContentLength: (req as any).socket?.bytesRead },
    });
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
    const statusCode = errorCodeToStatusCode(err.code);
    logError(requestLog, err, {
      category: 'system',
      code: `PRISMA_${err.code}`,
      statusCode,
      message: getPrismaErrorMessage(err.code),
      context: { prismaCode: err.code, meta: err.meta },
    });

    res.status(statusCode).json({
      error: {
        message: getPrismaErrorMessage(err.code),
        statusCode,
        requestId,
      },
    });
    return;
  }

  // Handle Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    logError(requestLog, err, {
      category: 'user',
      code: 'PRISMA_VALIDATION_ERROR',
      statusCode: 400,
      message: 'Invalid data provided',
    });
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
  logError(requestLog, err, {
    category: 'system',
    code: 'UNEXPECTED_ERROR',
    statusCode: 500,
    message: 'An unexpected error occurred',
  });

  res.status(500).json({
    error: {
      message: 'An unexpected error occurred',
      statusCode: 500,
      requestId,
    },
  });
};

/**
 * Map Prisma error codes to HTTP status codes
 */
const errorCodeToStatusCode = (code: string): number => {
  const codeMap: Record<string, number> = {
    P2002: 409, // Unique constraint violation
    P2025: 404, // Record not found
    P2003: 404, // Foreign key constraint failure
    P2015: 404, // Related record not found
  };
  return codeMap[code] ?? 500;
};

/**
 * Get user-friendly error messages for Prisma error codes
 */
const getPrismaErrorMessage = (code: string): string => {
  const messageMap: Record<string, string> = {
    P2002: 'A record with this identifier already exists',
    P2025: 'Resource not found',
    P2003: 'Referenced resource does not exist',
    P2015: 'Related record not found',
  };
  return messageMap[code] ?? 'Database operation failed';
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
