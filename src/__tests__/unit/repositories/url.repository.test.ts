import { describe, it, expect, beforeEach, vi } from "vitest";
import { UrlRepository } from "@/repositories/url.repository";
import { createShortUrl } from "../../fixtures/testData";
import { createMockPrismaClient, createMockCacheService } from "../../fixtures/mocks";

describe("UrlRepository", () => {
  let prisma: ReturnType<typeof createMockPrismaClient>;
  let cacheService: ReturnType<typeof createMockCacheService>;
  let repository: UrlRepository;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    cacheService = createMockCacheService();
    repository = new UrlRepository(prisma as any, cacheService as any);
  });

  describe("save", () => {
    it("should create a short URL and cache it", async () => {
      const created = createShortUrl({ code: "abc123" });

      prisma.shortUrl.create.mockResolvedValue({
        code: created.code,
        originalUrl: created.originalUrl,
        createdAt: created.createdAt,
      });

      const result = await repository.save({
        code: created.code,
        originalUrl: created.originalUrl,
      });

      expect(prisma.shortUrl.create).toHaveBeenCalledWith({
        data: {
          code: created.code,
          originalUrl: created.originalUrl,
        },
      });

      expect(cacheService.set).toHaveBeenCalledWith(created.code, result);
      expect(result).toEqual(created);
      expect(result).toMatchSnapshot();
    });
  });

  describe("findByCode", () => {
    it("should return cached value when present", async () => {
      const cached = createShortUrl({ code: "cached" });
      cacheService.get.mockResolvedValue(cached);

      const result = await repository.findByCode("cached");

      expect(cacheService.get).toHaveBeenCalledWith("cached");
      expect(prisma.shortUrl.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    it("should fetch from database on cache miss and then cache it", async () => {
      cacheService.get.mockResolvedValue(null);
      const dbRecord = createShortUrl({ code: "db" });
      prisma.shortUrl.findUnique.mockResolvedValue({
        code: dbRecord.code,
        originalUrl: dbRecord.originalUrl,
        createdAt: dbRecord.createdAt,
      });

      const result = await repository.findByCode("db");

      expect(prisma.shortUrl.findUnique).toHaveBeenCalledWith({
        where: { code: "db" },
      });
      expect(cacheService.set).toHaveBeenCalledWith("db", dbRecord);
      expect(result).toEqual(dbRecord);
      expect(result).toMatchSnapshot();
    });

    it("should return undefined when not found in cache or database", async () => {
      cacheService.get.mockResolvedValue(null);
      prisma.shortUrl.findUnique.mockResolvedValue(null);

      const result = await repository.findByCode("missing");

      expect(result).toBeUndefined();
    });
  });

  describe("getNextId", () => {
    it("should return next ID when records exist", async () => {
      prisma.shortUrl.findFirst.mockResolvedValue({ id: 5 });

      const nextId = await repository.getNextId();

      expect(prisma.shortUrl.findFirst).toHaveBeenCalledWith({
        orderBy: { id: "desc" },
        select: { id: true },
      });
      expect(nextId).toBe(6);
    });

    it("should return 1 when no records exist", async () => {
      prisma.shortUrl.findFirst.mockResolvedValue(null);

      const nextId = await repository.getNextId();

      expect(nextId).toBe(1);
    });
  });

  describe("disconnect", () => {
    it("should disconnect prisma", async () => {
      await repository.disconnect();
      expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
    });
  });
});