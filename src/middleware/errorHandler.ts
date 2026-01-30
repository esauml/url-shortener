import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { Prisma } from '@prisma/client';

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
  // Get request ID if available
  const requestId = (req as any).id || 'unknown';
  const workerId = process.env.WORKER_ID || process.env.HOSTNAME || '0';

  // Handle known operational errors
  if (err instanceof AppError) {
    console.error(`[Worker ${workerId}] [Request ${requestId}] ${err.constructor.name}: ${err.message}`);
    
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
        requestId,
      },
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(`[Worker ${workerId}] [Request ${requestId}] Prisma error ${err.code}:`, err.message);

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
    console.error(`[Worker ${workerId}] [Request ${requestId}] Prisma validation error:`, err.message);
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
  console.error(`[Worker ${workerId}] [Request ${requestId}] Unexpected error:`, err);
  console.error('Stack trace:', err.stack);

  res.status(500).json({
    error: {
      message: 'An unexpected error occurred',
      statusCode: 500,
      requestId,
    },
  });
};

/**
 * Middleware to add a unique request ID to each request
 * Should be registered before routes in app.ts
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate simple request ID (timestamp + random)
  (req as any).id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
};
