import { isValidUrl } from "../utils/validateUrl";
import { UrlRepository } from "../repositories/url.repository";
import { ShortUrl } from "../types/url";
import { createSnowflake, toBase62 } from "../utils/snowflake";

const snowflake = createSnowflake();

export const UrlService = {
    async createShortUrl(originalUrl: string): Promise<ShortUrl> {
        if (!isValidUrl(originalUrl)) {
            throw new Error("Invalid URL");
        }

        const id = snowflake.generate();
        const code = toBase62(id)

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
