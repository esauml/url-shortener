import { describe, it, expect, beforeEach, vi } from "vitest";
import { createUrlController } from "@/controllers/url.controller";
import { ValidationError } from "@/errors/AppError";
import { createShortUrl } from "../../fixtures/testData";
import {
  createMockUrlService,
  createMockRequest,
  createMockResponse,
  createMockNext,
} from "../../fixtures/mocks";

describe("url.controller", () => {
  const workerId = 7;
  let urlService: ReturnType<typeof createMockUrlService>;
  let controller: ReturnType<typeof createUrlController>;

  beforeEach(() => {
    urlService = createMockUrlService();
    controller = createUrlController(urlService as any, workerId);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  describe("shortenUrl", () => {
    it("should create short URL and respond with JSON", async () => {
      const shortUrl = createShortUrl({ code: "abc123" });
      urlService.createShortUrl.mockResolvedValue(shortUrl);

      const req = createMockRequest({ body: { url: shortUrl.originalUrl } });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.shortenUrl(req as any, res as any, next as any);

      expect(urlService.createShortUrl).toHaveBeenCalledWith(shortUrl.originalUrl);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledTimes(1);

      const responsePayload = (res.json as any).mock.calls[0]?.[0];
      expect(responsePayload).toMatchSnapshot();
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with ValidationError for invalid input", async () => {
      const req = createMockRequest({ body: { url: 123 } });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.shortenUrl(req as any, res as any, next as any);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
    });

    it("should call next when service throws", async () => {
      urlService.createShortUrl.mockRejectedValue(new Error("Service error"));

      const req = createMockRequest({ body: { url: "https://example.com" } });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.shortenUrl(req as any, res as any, next as any);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });
  });

  describe("redirectUrl", () => {
    it("should redirect to the original URL", async () => {
      urlService.getOriginalUrl.mockResolvedValue("https://example.com");

      const req = createMockRequest({ params: { code: "abc123" } });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.redirectUrl(req as any, res as any, next as any);

      expect(urlService.getOriginalUrl).toHaveBeenCalledWith("abc123");
      expect(res.redirect).toHaveBeenCalledWith(302, "https://example.com");
      expect(next).not.toHaveBeenCalled();

      const redirectArgs = (res.redirect as any).mock.calls[0];
      expect(redirectArgs).toMatchSnapshot();
    });

    it("should call next with ValidationError for invalid code", async () => {
      const req = createMockRequest({ params: { code: 123 } });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.redirectUrl(req as any, res as any, next as any);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
    });

    it("should call next when service throws", async () => {
      urlService.getOriginalUrl.mockRejectedValue(new Error("Not found"));

      const req = createMockRequest({ params: { code: "missing" } });
      const res = createMockResponse();
      const next = createMockNext();

      await controller.redirectUrl(req as any, res as any, next as any);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });
  });
});