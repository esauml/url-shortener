/**
 * Centralized Pino logger configuration
 * Provides structured JSON logging with configurable pretty printing
 */

import pino from 'pino';
import { config } from '@/config';

/**
 * Root logger instance with base context
 * Includes workerId and environment in all log entries
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
    timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Create a child logger with additional context
 * Used for request-scoped logging with requestId binding
 * 
 * @param bindings - Additional context to bind to the child logger
 * @returns Child logger instance
 */
export const createChildLogger = (bindings: Record<string, unknown>) => {
    return logger.child(bindings);
};
