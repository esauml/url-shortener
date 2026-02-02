import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";

import { config } from "@/config";
import { CacheService } from "@/services/cache.service";
import { UrlRepository } from "@/repositories/url.repository";
import { UrlService } from "@/services/url.service";
import { createSnowflake } from "@/utils/snowflake";
import { logger } from "@/logger";

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

    // Create child logger for cache service
    const cacheLogger = logger.child({ component: 'CacheService' });
    const cacheService = new CacheService(redisClient, config.redisTtl, cacheLogger);

    const urlRepository = new UrlRepository(prisma, cacheService);
    const snowflake = createSnowflake();

    // Create child logger for URL service
    const urlServiceLogger = logger.child({ component: 'UrlService' });
    const urlService = new UrlService(urlRepository, snowflake, urlServiceLogger);

    return {
        prisma,
        cacheService,
        urlRepository,
        urlService,
    };
};

export const container = createContainer();
