import { ShortUrl } from "@/types/url";

/**
 * Test data factory functions for generating consistent test data
 */

export const testUrls = {
    valid: [
        "https://example.com",
        "https://www.google.com",
        "http://localhost:3000",
        "https://sub.domain.example.com/path?query=value",
        "https://example.com:8080/path#fragment",
        "ftp://ftp.example.com",
    ],
    invalid: [
        "not-a-url",
        "htp://wrong-protocol.com",
        "//missing-protocol.com",
        "example.com",
        "",
        "   ",
        "javascript:alert('xss')",
    ],
};

export const testCodes = {
    valid: ["abc123", "XYZ789", "shortCode", "1A2B3C"],
    invalid: ["", "   ", "code with spaces", "code/with/slashes"],
};

/**
 * Factory function to create ShortUrl test objects
 * 
 * Note: The hardcoded date (2026-01-31T12:00:00Z) is intentional for snapshot reproducibility.
 * After this date passes, snapshots using this test data will need to be regenerated.
 * Consider using relative dates or mocking Date.now() if maintainability becomes a concern.
 */
export function createShortUrl(overrides?: Partial<ShortUrl>): ShortUrl {
    return {
        code: "testCode123",
        originalUrl: "https://example.com",
        createdAt: new Date("2026-01-31T12:00:00Z"),
        ...overrides,
    };
}

/**
 * Factory function to create multiple ShortUrl objects
 */
export function createShortUrls(count: number): ShortUrl[] {
    return Array.from({ length: count }, (_, i) =>
        createShortUrl({
            code: `code${i}`,
            originalUrl: `https://example${i}.com`,
            createdAt: new Date(Date.now() + i * 1000),
        })
    );
}

/**
 * Test timestamps for Snowflake tests
 */
export const testTimestamps = {
    epoch: 1704067200000, // 2024-01-01T00:00:00Z - must match Snowflake.EPOCH in snowflake.ts
    valid: 1738329600000, // 2026-01-31T12:00:00Z
    future: 2000000000000, // 2033-05-18T03:33:20Z
};

/**
 * Test worker IDs
 */
export const testWorkerIds = {
    min: 0,
    max: 1023,
    mid: 512,
    invalid: [-1, 1024, 2000],
};
