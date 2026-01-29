import { PrismaClient } from "@prisma/client";
import { ShortUrl } from "../types/url";
import { cacheService } from "../services/cache.service";

const prisma = new PrismaClient();

export const UrlRepository = {
    async save(data: Omit<ShortUrl, "createdAt">): Promise<ShortUrl> {
        const created = await prisma.shortUrl.create({
            data: {
                code: data.code,
                originalUrl: data.originalUrl,
            },
        });

        const shortUrl: ShortUrl = {
            code: created.code,
            originalUrl: created.originalUrl,
            createdAt: created.createdAt,
        };

        // Set in cache for immediate availability
        await cacheService.set(created.code, shortUrl);

        return shortUrl;
    },

    async findByCode(code: string): Promise<ShortUrl | undefined> {
        // Try cache first
        const cached = await cacheService.get(code);
        if (cached) {
            return cached;
        }

        // Fallback to database
        const url = await prisma.shortUrl.findUnique({
            where: { code },
        });

        if (!url) {
            return undefined;
        }

        const shortUrl: ShortUrl = {
            code: url.code,
            originalUrl: url.originalUrl,
            createdAt: url.createdAt,
        };

        // Populate cache for next time
        await cacheService.set(code, shortUrl);

        return shortUrl;
    },

    async getNextId(): Promise<number> {
        // Get the highest ID from the database
        const lastUrl = await prisma.shortUrl.findFirst({
            orderBy: { id: "desc" },
            select: { id: true },
        });

        return lastUrl ? lastUrl.id + 1 : 1;
    },

    // Helper method to disconnect Prisma when app shuts down
    async disconnect(): Promise<void> {
        await prisma.$disconnect();
    },
};
