import { generateCodeFromId } from "../utils/generateCode";
import { isValidUrl } from "../utils/validateUrl";
import { UrlRepository } from "../repositories/url.repository";
import { ShortUrl } from "../types/url";

export const UrlService = {
    createShortUrl(originalUrl: string): ShortUrl {
        if (!isValidUrl(originalUrl)) {
            throw new Error("Invalid URL");
        }

        // Get next incremental ID and generate collision-free code
        const id = UrlRepository.getNextId();
        const code = generateCodeFromId(id);

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
