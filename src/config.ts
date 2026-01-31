/**
 * Centralized configuration module for all environment variables
 */

// Helper function to parse integers with fallback
const parseIntWithFallback = (value: string | undefined, fallback: number): number => {
    if (!value) return fallback;
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

// Helper function to parse and validate positive integers
const parsePositiveInt = (value: string | undefined, fallback: number): number => {
    if (!value) return fallback;
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Parse environment variables with defaults
export const config = {
    // Server configuration
    port: parseIntWithFallback(process.env.PORT, 3000),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database configuration
    databaseUrl: process.env.DATABASE_URL || '',

    // Redis configuration
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    redisTtl: parsePositiveInt(process.env.REDIS_TTL, 3600),

    // Snowflake ID generation configuration
    workerId: parseIntWithFallback(
        process.env.WORKER_ID || process.env.HOSTNAME,
        0
    ),
    datacenterId: parseIntWithFallback(process.env.DATACENTER_ID, 0),
} as const;
