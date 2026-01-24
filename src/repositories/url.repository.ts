import { PrismaClient } from "@prisma/client";
import { ShortUrl } from "../types/url";

const prisma = new PrismaClient();

export const UrlRepository = {
    async save(data: Omit<ShortUrl, "createdAt">): Promise<ShortUrl> {
        const created = await prisma.shortUrl.create({
            data: {
                code: data.code,
                originalUrl: data.originalUrl,
            },
        });

        return {
            code: created.code,
            originalUrl: created.originalUrl,
            createdAt: created.createdAt,
        };
    },

    async findByCode(code: string): Promise<ShortUrl | undefined> {
        const url = await prisma.shortUrl.findUnique({
            where: { code },
        });

        if (!url) {
            return undefined;
        }

        return {
            code: url.code,
            originalUrl: url.originalUrl,
            createdAt: url.createdAt,
        };
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
