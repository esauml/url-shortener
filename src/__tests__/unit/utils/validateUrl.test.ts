import { describe, it, expect } from "vitest";
import { isValidUrl } from "@/utils/validateUrl";
import { testUrls } from "../../fixtures/testData";

describe("validateUrl", () => {
    describe("isValidUrl", () => {
        it("should return true for valid HTTP URLs", () => {
            expect(isValidUrl("http://example.com")).toBe(true);
            expect(isValidUrl("http://localhost")).toBe(true);
            expect(isValidUrl("http://127.0.0.1")).toBe(true);
        });

        it("should return true for valid HTTPS URLs", () => {
            expect(isValidUrl("https://example.com")).toBe(true);
            expect(isValidUrl("https://www.google.com")).toBe(true);
            expect(isValidUrl("https://sub.domain.example.com")).toBe(true);
        });

        it("should return true for URLs with ports", () => {
            expect(isValidUrl("http://localhost:3000")).toBe(true);
            expect(isValidUrl("https://example.com:8080")).toBe(true);
        });

        it("should return true for URLs with paths", () => {
            expect(isValidUrl("https://example.com/path")).toBe(true);
            expect(isValidUrl("https://example.com/path/to/resource")).toBe(true);
        });

        it("should return true for URLs with query parameters", () => {
            expect(isValidUrl("https://example.com?query=value")).toBe(true);
            expect(isValidUrl("https://example.com/path?foo=bar&baz=qux")).toBe(true);
        });

        it("should return true for URLs with fragments", () => {
            expect(isValidUrl("https://example.com#section")).toBe(true);
            expect(isValidUrl("https://example.com/path#fragment")).toBe(true);
        });

        it("should return true for other valid protocols", () => {
            expect(isValidUrl("ftp://ftp.example.com")).toBe(true);
            expect(isValidUrl("file:///path/to/file")).toBe(true);
        });

        it("should return false for strings without protocol", () => {
            expect(isValidUrl("example.com")).toBe(false);
            expect(isValidUrl("www.example.com")).toBe(false);
        });

        it("should return false for invalid protocols", () => {
            expect(isValidUrl("htp://example.com")).toBe(false);
            expect(isValidUrl("//example.com")).toBe(false);
        });

        it("should return false for empty strings", () => {
            expect(isValidUrl("")).toBe(false);
            expect(isValidUrl("   ")).toBe(false);
        });

        it("should return false for invalid URL formats", () => {
            expect(isValidUrl("not-a-url")).toBe(false);
            expect(isValidUrl("just some text")).toBe(false);
        });

        it("should return false for potentially dangerous protocols", () => {
            expect(isValidUrl("javascript:alert('xss')")).toBe(false);
            expect(isValidUrl("data:text/html,<script>alert('xss')</script>")).toBe(false);
        });

        describe("with test data fixtures", () => {
            it("should validate all valid URLs from testUrls", () => {
                testUrls.valid.forEach((url) => {
                    expect(isValidUrl(url)).toBe(true);
                });
            });

            it("should invalidate all invalid URLs from testUrls", () => {
                testUrls.invalid.forEach((url) => {
                    expect(isValidUrl(url)).toBe(false);
                });
            });
        });
    });
});
