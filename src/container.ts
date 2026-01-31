import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";

import { config } from "@/config";
import { CacheService } from "@/services/cache.service";
import { UrlRepository } from "@/repositories/url.repository";
import { UrlService } from "@/services/url.service";
import { createSnowflake } from "@/utils/snowflake";

export type Container = {
    prisma: PrismaClient;
    cacheService: CacheService;
    urlRepository: UrlRepository;
    urlService: UrlService;
};

export const createContainer = (): Container => {
    const prisma = new PrismaClient();

    const redisClient = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
    });

    const cacheService = new CacheService(redisClient, config.redisTtl);
    const urlRepository = new UrlRepository(prisma, cacheService);
    const snowflake = createSnowflake();
    const urlService = new UrlService(urlRepository, snowflake);

    return {
        prisma,
        cacheService,
        urlRepository,
        urlService,
    };
};

export const container = createContainer();
