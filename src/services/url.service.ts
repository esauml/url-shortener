import { generateCodeFromId } from "../utils/generateCode";
import { isValidUrl } from "../utils/validateUrl";
import { UrlRepository } from "../repositories/url.repository";
import { ShortUrl } from "../types/url";

export const UrlService = {
    async createShortUrl(originalUrl: string): Promise<ShortUrl> {
        if (!isValidUrl(originalUrl)) {
            throw new Error("Invalid URL");
        }

        // Get next incremental ID and generate collision-free code
        const id = await UrlRepository.getNextId();
        const code = generateCodeFromId(id);

        const shortUrl: Omit<ShortUrl, "createdAt"> = {
            code,
            originalUrl,
        };

        return await UrlRepository.save(shortUrl);
    },

    async getOriginalUrl(code: string): Promise<string | null> {
        const record = await UrlRepository.findByCode(code);
        return record?.originalUrl ?? null;
    }
};
