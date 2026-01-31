import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CacheService } from "@/services/cache.service";
import { createMockRedisClient } from "../../fixtures/mocks";
import { createShortUrl } from "../../fixtures/testData";

describe("CacheService", () => {
  let mockRedis: ReturnType<typeof createMockRedisClient>;
  let cacheService: CacheService;
  const ttl = 3600;

  beforeEach(() => {
    mockRedis = createMockRedisClient();
    cacheService = new CacheService(mockRedis as any, ttl);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should register redis event handlers on construction", () => {
    expect(mockRedis.on).toHaveBeenCalledTimes(3);
  });

  it("should connect to redis", async () => {
    await cacheService.connect();
    expect(mockRedis.connect).toHaveBeenCalledTimes(1);
  });

  it("should return null when redis is not ready", async () => {
    mockRedis.status = "end" as any;
    const result = await cacheService.get("abc123");
    expect(result).toBeNull();
    expect(mockRedis.get).not.toHaveBeenCalled();
  });

  it("should return parsed ShortUrl from cache", async () => {
    const shortUrl = createShortUrl();
    mockRedis.get.mockResolvedValue(JSON.stringify(shortUrl));

    const result = await cacheService.get("abc123");

    expect(result).not.toBeNull();
    expect(result?.code).toBe(shortUrl.code);
    expect(result?.originalUrl).toBe(shortUrl.originalUrl);
    expect(result?.createdAt).toBeInstanceOf(Date);

    expect(result).toMatchSnapshot();
  });

  it("should return null when cache is empty", async () => {
    mockRedis.get.mockResolvedValue(null);

    const result = await cacheService.get("missing");
    expect(result).toBeNull();
  });

  it("should handle cache get errors gracefully", async () => {
    mockRedis.get.mockRejectedValue(new Error("Redis error"));

    const result = await cacheService.get("error");
    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it("should not set cache when redis is not ready", async () => {
    mockRedis.status = "end" as any;
    await cacheService.set("abc123", createShortUrl());
    expect(mockRedis.setex).not.toHaveBeenCalled();
  });

  it("should set cache with TTL", async () => {
    const shortUrl = createShortUrl();
    await cacheService.set(shortUrl.code, shortUrl);

    expect(mockRedis.setex).toHaveBeenCalledWith(
      `url:${shortUrl.code}`,
      ttl,
      JSON.stringify(shortUrl)
    );
  });

  it("should handle cache set errors gracefully", async () => {
    mockRedis.setex.mockRejectedValue(new Error("Redis error"));
    await cacheService.set("abc123", createShortUrl());

    expect(console.error).toHaveBeenCalled();
  });

  it("should quit redis when ready on disconnect", async () => {
    mockRedis.status = "ready" as any;
    await cacheService.disconnect();
    expect(mockRedis.quit).toHaveBeenCalledTimes(1);
    expect(mockRedis.disconnect).not.toHaveBeenCalled();
  });

  it("should force disconnect when not ready", async () => {
    mockRedis.status = "end" as any;
    await cacheService.disconnect();
    expect(mockRedis.disconnect).toHaveBeenCalledTimes(1);
  });

  it("should force disconnect on quit error", async () => {
    mockRedis.status = "ready" as any;
    mockRedis.quit.mockRejectedValue(new Error("Quit failed"));

    await cacheService.disconnect();

    expect(mockRedis.disconnect).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalled();
  });
});