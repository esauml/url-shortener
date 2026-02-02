/**
 * Centralized Pino logger configuration
 * Provides structured JSON logging with configurable pretty printing
 */

import pino from 'pino';
import type { Logger } from 'pino';
import { config } from '@/config';
import { Prisma } from '@prisma/client';

/**
 * Custom Prisma error serializer
 * Flattens nested Prisma error structure for better log searchability
 */
const prismaErrorSerializer = (err: any) => {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        return {
            type: 'PrismaClientKnownRequestError',
            code: err.code,
            message: err.message,
            meta: err.meta,
            statusCode: errorCodeToStatusCode(err.code),
        };
    }
    if (err instanceof Prisma.PrismaClientValidationError) {
        return {
            type: 'PrismaClientValidationError',
            message: err.message,
        };
    }
    return err;
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
 * Custom error serializer that includes stack traces and error type
 */
const errorSerializer = (err: any) => {
    // Handle Prisma errors specially
    if (err instanceof Prisma.PrismaClientKnownRequestError ||
        err instanceof Prisma.PrismaClientValidationError) {
        return prismaErrorSerializer(err);
    }

    return {
        type: err.name || 'Error',
        message: err.message,
        stack: err.stack,
        ...(err.statusCode && { statusCode: err.statusCode }),
    };
};

/**
 * Root logger instance with base context
 * Includes workerId and environment in all log entries
 * Configured with error serializers and sensitive data redaction
 */
export const logger = pino({
    level: config.logLevel,
    ...(config.logPretty && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            }
        }
    }),
    base: {
        workerId: config.workerId,
        env: config.nodeEnv,
    },
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
    serializers: {
        err: errorSerializer,
        error: errorSerializer,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
        paths: [
            'url',
            'originalUrl',
            'headers.authorization',
            'headers.cookie',
            'headers["x-api-key"]',
            'password',
            'token',
            'secret',
            'apiKey',
            'accessToken',
            'refreshToken',
        ],
        censor: '[REDACTED]',
        remove: false,
    },
});

/**
 * Create a child logger with additional context
 * Used for request-scoped logging with requestId binding
 * 
 * @param bindings - Additional context to bind to the child logger
 * @returns Child logger instance
 */
export const createChildLogger = (bindings: Record<string, unknown>): Logger => {
    return logger.child(bindings);
};
