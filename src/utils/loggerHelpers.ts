/**
 * Logger utility helpers for common logging patterns
 * Provides consistent error handling and performance logging
 */

import type { Logger } from 'pino';

/**
 * Structured error context for consistent error logging across the app
 */
export interface ErrorContext {
    /** Error category: 'user' (client error), 'system' (server error), 'external' (third-party) */
    category: 'user' | 'system' | 'external';
    /** Unique error code for monitoring and alerting */
    code: string;
    /** HTTP status code to return to client */
    statusCode: number;
    /** User-friendly error message */
    message: string;
    /** Additional context data (will be redacted if sensitive) */
    context?: Record<string, unknown>;
}

/**
 * Log an application error with structured context
 * Automatically categorizes errors and includes relevant metadata
 * 
 * @example
 * logError(req.log, err, {
 *   category: 'system',
 *   code: 'DB_QUERY_FAILED',
 *   statusCode: 500,
 *   message: 'Failed to fetch user from database',
 * });
 */
export const logError = (
    logger: Logger,
    error: Error | unknown,
    context: ErrorContext
): void => {
    logger.error(
        {
            err: error,
            errorCode: context.code,
            errorCategory: context.category,
            statusCode: context.statusCode,
            ...context.context,
        },
        context.message
    );
};

/**
 * Log request start for performance monitoring
 * Returns a stop function to measure request duration
 * 
 * @example
 * const stopTimer = logRequestStart(req.log, 'Create URL');
 * try {
 *   // ... operation
 *   stopTimer(200);
 * } catch (err) {
 *   stopTimer(500);
 * }
 */
export const logRequestStart = (
    logger: Logger,
    operation: string
): ((statusCode?: number) => void) => {
    const startTime = Date.now();

    return (statusCode?: number) => {
        const duration = Date.now() - startTime;
        logger.info(
            {
                operation,
                duration,
                statusCode,
            },
            `${operation} completed in ${duration}ms`
        );
    };
};

/**
 * Log validation errors with all issues
 * Useful for form validation and data validation errors
 * 
 * @example
 * logValidationErrors(req.log, zodError.issues);
 */
export const logValidationErrors = (
    logger: Logger,
    errors: Array<{ path: string[]; message: string }>,
    operation?: string
): void => {
    logger.warn(
        {
            validationErrors: errors.map(e => ({
                path: e.path.join('.'),
                message: e.message,
            })),
            count: errors.length,
        },
        `Validation failed${operation ? ` during ${operation}` : ''}`
    );
};

/**
 * Log external service calls for debugging integration issues
 * 
 * @example
 * logExternalCall(logger, 'RedisCache', 'get', {
 *   key: 'url:abc123',
 *   ttl: 3600,
 * });
 */
export const logExternalCall = (
    logger: Logger,
    service: string,
    operation: string,
    data?: Record<string, unknown>
): void => {
    logger.debug(
        {
            service,
            operation,
            ...data,
        },
        `External call: ${service}.${operation}`
    );
};

/**
 * Log cache hits and misses for performance analysis
 * 
 * @example
 * logCacheOperation(logger, 'urlCache', 'get', true, { key: 'url:abc123' });
 */
export const logCacheOperation = (
    logger: Logger,
    cacheName: string,
    operation: 'get' | 'set' | 'delete' | 'clear',
    hit: boolean,
    data?: Record<string, unknown>
): void => {
    logger.debug(
        {
            cache: cacheName,
            operation,
            hit,
            ...data,
        },
        `Cache ${operation} - ${hit ? 'HIT' : 'MISS'}`
    );
};

/**
 * Log deprecation warnings for tracking API changes
 * 
 * @example
 * logDeprecation(logger, 'createUrlShortener', 'Use createShortUrl instead');
 */
export const logDeprecation = (
    logger: Logger,
    feature: string,
    replacement: string
): void => {
    logger.warn(
        {
            deprecatedFeature: feature,
            replacement,
        },
        `Deprecated feature used: ${feature}`
    );
};
