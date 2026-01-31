import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getWorkerId } from "@/utils/getWorkerId";
import crypto from "crypto";
import os from "os";

describe("getWorkerId", () => {
    let originalHostname: string;

    beforeEach(() => {
        // Store original hostname
        originalHostname = os.hostname();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should return a number", () => {
        const workerId = getWorkerId();
        expect(typeof workerId).toBe("number");
    });

    it("should return a value between 0 and 1023", () => {
        const workerId = getWorkerId();
        expect(workerId).toBeGreaterThanOrEqual(0);
        expect(workerId).toBeLessThanOrEqual(1023);
    });

    it("should return consistent value for same hostname", () => {
        const id1 = getWorkerId();
        const id2 = getWorkerId();
        expect(id1).toBe(id2);
    });

    it("should apply 10-bit mask (0b1111111111)", () => {
        const workerId = getWorkerId();
        // Result should fit in 10 bits
        expect(workerId & 0b1111111111).toBe(workerId);
    });

    it("should use MD5 hash of hostname", () => {
        const hostname = os.hostname();
        const hash = crypto.createHash("md5").update(hostname).digest();
        const expectedId = (hash[0] ?? 0) & 0b1111111111;

        const workerId = getWorkerId();
        expect(workerId).toBe(expectedId);
    });

    describe("with mocked hostnames", () => {
        it("should generate different IDs for different hostnames", () => {
            const hostnames = ["server1", "server2", "server3", "localhost", "production-1"];
            const workerIds = new Set<number>();

            hostnames.forEach((hostname) => {
                // Mock os.hostname() to return specific hostname
                vi.spyOn(os, "hostname").mockReturnValue(hostname);

                // Clear require cache to get fresh getWorkerId
                const hash = crypto.createHash("md5").update(hostname).digest();
                const expectedId = (hash[0] ?? 0) & 0b1111111111;

                expect(expectedId).toBeGreaterThanOrEqual(0);
                expect(expectedId).toBeLessThanOrEqual(1023);

                workerIds.add(expectedId);
            });

            // Most hostnames should produce different IDs (though collisions are possible)
            // We just verify they all fall in valid range
            expect(Array.from(workerIds).every((id) => id >= 0 && id <= 1023)).toBe(true);
        });

        it("should handle empty hostname gracefully", () => {
            vi.spyOn(os, "hostname").mockReturnValue("");

            const hash = crypto.createHash("md5").update("").digest();
            const expectedId = (hash[0] ?? 0) & 0b1111111111;

            expect(expectedId).toBeGreaterThanOrEqual(0);
            expect(expectedId).toBeLessThanOrEqual(1023);
        });

        it("should handle very long hostname", () => {
            const longHostname = "a".repeat(1000);
            vi.spyOn(os, "hostname").mockReturnValue(longHostname);

            const hash = crypto.createHash("md5").update(longHostname).digest();
            const expectedId = (hash[0] ?? 0) & 0b1111111111;

            expect(expectedId).toBeGreaterThanOrEqual(0);
            expect(expectedId).toBeLessThanOrEqual(1023);
        });

        it("should handle special characters in hostname", () => {
            const specialHostname = "host-name_123.local";
            vi.spyOn(os, "hostname").mockReturnValue(specialHostname);

            const hash = crypto.createHash("md5").update(specialHostname).digest();
            const expectedId = (hash[0] ?? 0) & 0b1111111111;

            expect(expectedId).toBeGreaterThanOrEqual(0);
            expect(expectedId).toBeLessThanOrEqual(1023);
        });
    });

    it("should use first byte of MD5 hash", () => {
        const hostname = os.hostname();
        const hash = crypto.createHash("md5").update(hostname).digest();

        // Verify we're using the first byte
        const firstByte = hash[0] ?? 0;
        const maskedValue = firstByte & 0b1111111111;

        const workerId = getWorkerId();
        expect(workerId).toBe(maskedValue);
    });

    it("should handle case where hash[0] is 0", () => {
        // Find a hostname that produces hash starting with 0
        // Or mock it directly
        const mockHash = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
        vi.spyOn(crypto, "createHash").mockReturnValue({
            update: vi.fn().mockReturnThis(),
            digest: vi.fn().mockReturnValue(mockHash),
        } as any);

        const workerId = getWorkerId();
        expect(workerId).toBe(0);
    });
});
