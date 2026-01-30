import { ValidationError, NotFoundError } from "@/errors/AppError";
import { UrlRepository } from "@/repositories/url.repository";
import { ShortUrl } from "@/types/url";
import { createSnowflake, toBase62 } from "@/utils/snowflake";
import { isValidUrl } from "@/utils/validateUrl";

const snowflake = createSnowflake();

export const UrlService = {
    async createShortUrl(originalUrl: string): Promise<ShortUrl> {
        if (!isValidUrl(originalUrl)) {
            throw new ValidationError("Invalid URL");
        }

        const id = snowflake.generate();
        const code = toBase62(id)

        const shortUrl: Omit<ShortUrl, "createdAt"> = {
            code,
            originalUrl,
        };

        return await UrlRepository.save(shortUrl);
    },

    async getOriginalUrl(code: string): Promise<string> {
        const record = await UrlRepository.findByCode(code);

        if (!record) throw new NotFoundError("URL not found");

        return record.originalUrl;
    }
};
