import { ValidationError, NotFoundError } from "@/errors/AppError";
import { UrlRepository } from "@/repositories/url.repository";
import { ShortUrl } from "@/types/url";
import { Snowflake, toBase62 } from "@/utils/snowflake";
import { isValidUrl } from "@/utils/validateUrl";

export class UrlService {
    constructor(
        private urlRepository: UrlRepository,
        private snowflake: Snowflake
    ) { }

    async createShortUrl(originalUrl: string): Promise<ShortUrl> {
        if (!isValidUrl(originalUrl)) {
            throw new ValidationError("Invalid URL");
        }

        const id = this.snowflake.generate();
        const code = toBase62(id)

        const shortUrl: Omit<ShortUrl, "createdAt"> = {
            code,
            originalUrl,
        };

        return await this.urlRepository.save(shortUrl);
    }

    async getOriginalUrl(code: string): Promise<string> {
        const record = await this.urlRepository.findByCode(code);

        if (!record) throw new NotFoundError("URL not found");

        return record.originalUrl;
    }
}
