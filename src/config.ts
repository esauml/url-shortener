/**
 * Centralized configuration module for all environment variables
 * Uses Zod for type-safe validation of environment variables
 */

import { z } from 'zod';
import { getWorkerId } from '@/utils/getWorkerId';

/**
 * Environment variable schema with validation rules
 * 
 * Env vars:
 * - PORT: Server port (1-65535), default: 3000
 * - NODE_ENV: Environment mode, default: 'development'
 * - DATABASE_URL: PostgreSQL connection string (required by Prisma)
 * - REDIS_URL: Redis connection URL, default: 'redis://localhost:6379'
 * - REDIS_TTL: Cache TTL in seconds (must be > 0), default: 3600
 * - WORKER_ID: Explicit worker ID for distributed ID generation
 * - HOSTNAME: Fallback identifier when WORKER_ID not set
 * - DATACENTER_ID: Datacenter ID for Snowflake IDs, default: 0
 * - LOG_LEVEL: Logging level (trace, debug, info, warn, error, fatal), default: 'info' in production, 'debug' in development
 * - LOG_PRETTY: Enable pretty printing for logs, default: true in development, false in production
 */
const envSchema = z.object({
    PORT: z.coerce
        .number()
        .int()
        .min(1)
        .max(65535)
        .optional()
        .default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().startsWith('redis://', 'REDIS_URL must be a valid Redis connection string').optional().default('redis://localhost:6379'),
    REDIS_TTL: z.coerce
        .number()
        .int()
        .positive()
        .optional()
        .default(3600),
    WORKER_ID: z.coerce.number().int().min(0).max(1023).optional(),
    HOSTNAME: z.string().optional(),
    DATACENTER_ID: z.coerce.number().int().min(0).optional().default(0),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
    LOG_PRETTY: z.coerce.boolean().optional(),
});

type EnvConfig = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 * Throws on invalid configuration
 */
const parseConfig = (): EnvConfig => {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            // Format validation errors for structured output
            const validationErrors = error.issues.map(issue => ({
                path: issue.path.join('.'),
                message: issue.message,
            }));

            // Use console.error here since logger is not yet initialized
            // Logger depends on config, so we can't use it during config validation
            console.error(JSON.stringify({
                level: 'error',
                msg: 'Invalid environment configuration',
                validationErrors,
            }));
        }
        throw new Error('Failed to load environment configuration');
    }
};

const env = parseConfig();

/**
 * Determine effective worker ID with priority:
 * 1. Explicit WORKER_ID env var (0-1023)
 * 2. Derive from hostname hash if WORKER_ID not set
 * This ensures config.workerId always reflects the actual ID used by Snowflake
 */
const resolveWorkerId = (): number => {
    if (env.WORKER_ID !== undefined) {
        return env.WORKER_ID;
    }
    // Derive worker ID from hostname hash when not explicitly set
    return getWorkerId();
};

/**
 * Validated configuration object
 * All values are guaranteed to be valid and properly typed
 */
export const config = {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    redisTtl: env.REDIS_TTL,
    workerId: resolveWorkerId(),
    datacenterId: env.DATACENTER_ID,
    logLevel: env.LOG_LEVEL ?? (env.NODE_ENV === 'production' ? 'info' : 'debug'),
    logPretty: env.LOG_PRETTY ?? (env.NODE_ENV !== 'production'),
} as const;
