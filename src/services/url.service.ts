import { generateCode } from "../utils/generateCode";
import { isValidUrl } from "../utils/validateUrl";
import { UrlRepository } from "../repositories/url.repository";
import { ShortUrl } from "../types/url";

export const UrlService = {
    createShortUrl(originalUrl: string): ShortUrl {
        if (!isValidUrl(originalUrl)) {
            throw new Error("Invalid URL");
        }

        const code = generateCode();
        const shortUrl: ShortUrl = {
            code,
            originalUrl,
            createdAt: new Date()
        };

        return UrlRepository.save(shortUrl);
    },

    getOriginalUrl(code: string): string | null {
        const record = UrlRepository.findByCode(code);
        return record?.originalUrl ?? null;
    }
};
