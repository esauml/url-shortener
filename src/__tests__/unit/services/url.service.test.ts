import "../../fixtures/mockConfig";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { UrlService } from "@/services/url.service";
import { ValidationError, NotFoundError } from "@/errors/AppError";
import { createShortUrl } from "../../fixtures/testData";
import { createMockUrlRepository } from "../../fixtures/mocks";

describe("UrlService", () => {
    let urlService: UrlService;
    let mockRepository: ReturnType<typeof createMockUrlRepository>;
    let mockSnowflake: { generate: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        mockRepository = createMockUrlRepository();
        mockSnowflake = { generate: vi.fn(() => 1n) };
        urlService = new UrlService(mockRepository as any, mockSnowflake as any);
    });

    describe("createShortUrl", () => {
        it("should create a short URL for valid input", async () => {
            const originalUrl = "https://example.com";
            const saved = createShortUrl({ code: "1" });

            mockRepository.save.mockResolvedValue(saved);

            const result = await urlService.createShortUrl(originalUrl);

            expect(mockSnowflake.generate).toHaveBeenCalledTimes(1);
            expect(mockRepository.save).toHaveBeenCalledWith({
                code: "1",
                originalUrl,
            });
            expect(result).toEqual(saved);
            expect(result).toMatchSnapshot();
        });

        it("should throw ValidationError for invalid URL", async () => {
            await expect(urlService.createShortUrl("invalid-url")).rejects.toThrow(
                ValidationError
            );
            await expect(urlService.createShortUrl("invalid-url")).rejects.toThrow(
                "Invalid URL"
            );
        });
    });

    describe("getOriginalUrl", () => {
        it("should return original URL for existing code", async () => {
            const record = createShortUrl({ code: "abc123" });
            mockRepository.findByCode.mockResolvedValue(record);

            const result = await urlService.getOriginalUrl("abc123");

            expect(result).toBe(record.originalUrl);
        });

        it("should throw NotFoundError when code does not exist", async () => {
            mockRepository.findByCode.mockResolvedValue(undefined);

            await expect(urlService.getOriginalUrl("missing")).rejects.toThrow(
                NotFoundError
            );
            await expect(urlService.getOriginalUrl("missing")).rejects.toThrow(
                "URL not found"
            );
        });
    });
});