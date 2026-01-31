import { describe, it, expect, beforeEach, vi } from "vitest";
import { Snowflake, toBase62, createSnowflake } from "@/utils/snowflake";
import { ValidationError, SystemClockError } from "@/errors/AppError";
import { testWorkerIds, testTimestamps } from "../../fixtures/testData";

describe("Snowflake", () => {
    describe("constructor", () => {
        it("should create Snowflake with valid worker ID", () => {
            expect(() => new Snowflake(0)).not.toThrow();
            expect(() => new Snowflake(512)).not.toThrow();
            expect(() => new Snowflake(1023)).not.toThrow();
        });

        it("should accept minimum worker ID (0)", () => {
            const snowflake = new Snowflake(testWorkerIds.min);
            expect(snowflake).toBeInstanceOf(Snowflake);
        });

        it("should accept maximum worker ID (1023)", () => {
            const snowflake = new Snowflake(testWorkerIds.max);
            expect(snowflake).toBeInstanceOf(Snowflake);
        });

        it("should throw ValidationError for negative worker ID", () => {
            expect(() => new Snowflake(-1)).toThrow(ValidationError);
            expect(() => new Snowflake(-1)).toThrow("workerId must be between 0 and 1023");
        });

        it("should throw ValidationError for worker ID > 1023", () => {
            expect(() => new Snowflake(1024)).toThrow(ValidationError);
            expect(() => new Snowflake(2000)).toThrow(ValidationError);
        });

        it("should reject all invalid worker IDs from testData", () => {
            testWorkerIds.invalid.forEach((id) => {
                expect(() => new Snowflake(id)).toThrow(ValidationError);
            });
        });
    });

    describe("generate", () => {
        let snowflake: Snowflake;
        let dateNowSpy: any;

        beforeEach(() => {
            snowflake = new Snowflake(1);
            dateNowSpy = vi.spyOn(Date, "now");
        });

        it("should generate a bigint ID", () => {
            const id = snowflake.generate();
            expect(typeof id).toBe("bigint");
            expect(id).toBeGreaterThan(0n);
        });

        it("should generate unique IDs on subsequent calls", () => {
            const id1 = snowflake.generate();
            const id2 = snowflake.generate();
            const id3 = snowflake.generate();

            expect(id1).not.toBe(id2);
            expect(id2).not.toBe(id3);
            expect(id1).not.toBe(id3);
        });

        it("should generate IDs in ascending order within same millisecond", () => {
            // Fix timestamp so all IDs are generated in same millisecond
            const fixedTime = testTimestamps.valid;
            dateNowSpy.mockReturnValue(fixedTime);

            const ids = Array.from({ length: 100 }, () => snowflake.generate());

            for (let i = 1; i < ids.length; i++) {
                expect(ids[i]).toBeGreaterThan(ids[i - 1]!);
            }
        });

        it("should increment sequence within same millisecond", () => {
            const fixedTime = testTimestamps.valid;
            dateNowSpy.mockReturnValue(fixedTime);

            const id1 = snowflake.generate();
            const id2 = snowflake.generate();

            // Extract sequence from ID (last 12 bits)
            const seq1 = Number(id1 & 0xfffn);
            const seq2 = Number(id2 & 0xfffn);

            expect(seq2).toBe(seq1 + 1);
        });

        it("should reset sequence when timestamp changes", () => {
            let currentTime = testTimestamps.valid;
            dateNowSpy.mockImplementation(() => currentTime);

            const id1 = snowflake.generate();
            const seq1 = Number(id1 & 0xfffn);

            // Advance time
            currentTime += 1;
            const id2 = snowflake.generate();
            const seq2 = Number(id2 & 0xfffn);

            expect(seq2).toBe(0); // Should reset to 0 on new millisecond
        });

        it("should wait for next millisecond when sequence overflows", () => {
            let currentTime = testTimestamps.valid;
            dateNowSpy.mockImplementation(() => currentTime);

            // Generate 4096 IDs (max sequence + 1) to force overflow
            for (let i = 0; i < 4096; i++) {
                snowflake.generate();
            }

            // Advance time for the waiting mechanism
            currentTime += 1;

            // Next ID should be in next millisecond
            const nextId = snowflake.generate();
            const sequence = Number(nextId & 0xfffn);

            expect(sequence).toBe(0); // Should start fresh sequence
        });

        it("should throw SystemClockError when clock moves backwards", () => {
            let currentTime = testTimestamps.valid;
            dateNowSpy.mockImplementation(() => currentTime);

            snowflake.generate(); // Generate first ID

            // Move clock backwards
            currentTime -= 1000;

            expect(() => snowflake.generate()).toThrow(SystemClockError);
            expect(() => snowflake.generate()).toThrow("Clock moved backwards");
        });

        it("should encode worker ID in the generated ID", () => {
            const workerId = 42;
            const testSnowflake = new Snowflake(workerId);

            const id = testSnowflake.generate();

            // Extract worker ID from ID (bits 12-21, so shift right 12 and mask 10 bits)
            const extractedWorkerId = Number((id >> 12n) & 0x3ffn);

            expect(extractedWorkerId).toBe(workerId);
        });

        it("should encode timestamp in the generated ID", () => {
            const fixedTime = testTimestamps.valid;
            dateNowSpy.mockReturnValue(fixedTime);

            const id = snowflake.generate();

            // Extract timestamp (top 41 bits)
            const timestampOffset = id >> 22n;
            const expectedOffset = BigInt(fixedTime - testTimestamps.epoch);

            expect(timestampOffset).toBe(expectedOffset);
        });
    });

    describe("toBase62", () => {
        it("should convert 0 to '0'", () => {
            expect(toBase62(0n)).toBe("0");
        });

        it("should convert small numbers correctly", () => {
            expect(toBase62(1n)).toBe("1");
            expect(toBase62(10n)).toBe("A");
            expect(toBase62(35n)).toBe("Z");
            expect(toBase62(36n)).toBe("a");
            expect(toBase62(61n)).toBe("z");
        });

        it("should convert 62 to '10' (base 62)", () => {
            expect(toBase62(62n)).toBe("10");
        });

        it("should convert large numbers", () => {
            expect(toBase62(3844n)).toBe("100"); // 62^2
            expect(toBase62(238328n)).toBe("1000"); // 62^3
        });

        it("should convert realistic Snowflake IDs", () => {
            const snowflake = new Snowflake(1);
            const id = snowflake.generate();
            const code = toBase62(id);

            expect(typeof code).toBe("string");
            expect(code.length).toBeGreaterThan(0);
            expect(code).toMatch(/^[0-9A-Za-z]+$/);
        });

        it("should produce different codes for different IDs", () => {
            const snowflake = new Snowflake(1);
            const id1 = snowflake.generate();
            const id2 = snowflake.generate();

            const code1 = toBase62(id1);
            const code2 = toBase62(id2);

            expect(code1).not.toBe(code2);
        });

        it("should use only alphanumeric characters", () => {
            const testCases = [0n, 100n, 1000n, 10000n, 100000n, 1000000n];

            testCases.forEach((num) => {
                const result = toBase62(num);
                expect(result).toMatch(/^[0-9A-Za-z]+$/);
            });
        });
    });

    describe("createSnowflake", () => {
        it("should create a Snowflake instance", () => {
            const snowflake = createSnowflake();
            expect(snowflake).toBeInstanceOf(Snowflake);
        });

        it("should generate valid IDs", () => {
            const snowflake = createSnowflake();
            const id = snowflake.generate();
            expect(typeof id).toBe("bigint");
            expect(id).toBeGreaterThan(0n);
        });
    });
});
