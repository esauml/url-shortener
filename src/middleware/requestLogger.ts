/**
 * Request logging middleware using pino-http
 * Attaches a child logger with requestId to each request
 */

import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { logger } from '@/logger';

/**
 * Pino HTTP middleware that:
 * - Auto-logs HTTP requests and responses
 * - Creates child logger with requestId for each request
 * - Attaches logger to req.log for use in controllers
 */
export const requestLogger = pinoHttp({
    logger,
    genReqId: (req, res) => {
        const existingId = req.id ?? req.headers['x-request-id'];
        if (existingId) return existingId;
        const id = randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
    },
    customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) {
            return 'error';
        }
        if (res.statusCode >= 400) {
            return 'warn';
        }
        return 'info';
    },
    customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} - ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
    },
    customAttributeKeys: {
        req: 'request',
        res: 'response',
        err: 'error',
        responseTime: 'responseTime',
    },
    serializers: {
        req: (req) => ({
            method: req.method,
            url: req.url,
            path: req.path,
            query: req.query,
            params: req.params,
        }),
        res: (res) => ({
            statusCode: res.statusCode,
        }),
    },
});
