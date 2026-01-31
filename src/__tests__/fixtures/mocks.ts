import { vi } from "vitest";
import { ShortUrl } from "@/types/url";
import { createShortUrl } from "./testData";

/**
 * Mock factory for Prisma Client
 */
export function createMockPrismaClient() {
    return {
        shortUrl: {
            create: vi.fn(),
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        $disconnect: vi.fn(),
    };
}

/**
 * Mock factory for Redis (ioredis) Client
 */
export function createMockRedisClient() {
    const mockRedis = {
        status: "ready" as const,
        get: vi.fn(),
        setex: vi.fn(),
        del: vi.fn(),
        connect: vi.fn().mockResolvedValue(undefined),
        quit: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn(),
        on: vi.fn(),
    };

    return mockRedis;
}

/**
 * Mock factory for CacheService
 */
export function createMockCacheService() {
    return {
        get: vi.fn(),
        set: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
    };
}

/**
 * Mock factory for UrlRepository
 */
export function createMockUrlRepository() {
    return {
        save: vi.fn(),
        findByCode: vi.fn(),
        getNextId: vi.fn(),
        disconnect: vi.fn(),
    };
}

/**
 * Mock factory for Snowflake ID generator
 */
export function createMockSnowflake(workerId = 0) {
    let sequence = 0;
    return {
        workerId,
        generate: vi.fn(() => {
            // Generate deterministic IDs for testing
            const timestamp = BigInt(Date.now() - 1704067200000);
            const id = (timestamp << 22n) | (BigInt(workerId) << 12n) | BigInt(sequence++);
            return id;
        }),
    };
}

/**
 * Mock factory for UrlService
 */
export function createMockUrlService() {
    return {
        createShortUrl: vi.fn(),
        getOriginalUrl: vi.fn(),
    };
}

/**
 * Mock Express Request object
 */
export function createMockRequest(overrides?: any) {
    return {
        body: {},
        params: {},
        query: {},
        headers: {},
        protocol: "http",
        get: vi.fn((header: string) => {
            if (header === "host") return "localhost:3000";
            return undefined;
        }),
        ...overrides,
    };
}

/**
 * Mock Express Response object
 */
export function createMockResponse() {
    const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        redirect: vi.fn().mockReturnThis(),
    };
    return res;
}

/**
 * Mock Express NextFunction
 */
export function createMockNext() {
    return vi.fn();
}

/**
 * Helper to create a mock ShortUrl with Prisma format
 */
export function createPrismaShortUrl(overrides?: Partial<ShortUrl>) {
    const base = createShortUrl(overrides);
    return {
        id: BigInt(12345),
        ...base,
    };
}
