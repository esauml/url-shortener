import Redis from 'ioredis';
import { ShortUrl } from '@/types/url';
import type { Logger } from 'pino';

export class CacheService {
    private client: Redis;
    private ttl: number;
    private logger: Logger;

    private get isReady(): boolean {
        return this.client.status === 'ready';
    }

    constructor(client: Redis, ttl: number, logger: Logger) {
        this.client = client;
        this.ttl = ttl;
        this.logger = logger;

        this.client.on('ready', () => {
            this.logger.info('Redis connected and ready');
        });

        this.client.on('error', (err) => {
            this.logger.error({ err }, 'Redis error');
        });

        this.client.on('close', () => {
            this.logger.info('Redis connection closed');
        });
    }

    async connect(): Promise<void> {
        await this.client.connect();
    }

    async get(code: string): Promise<ShortUrl | null> {
        if (!this.isReady) {
            return null;
        }

        try {
            const cached = await this.client.get(`url:${code}`);
            if (!cached) {
                return null;
            }

            const parsed = JSON.parse(cached);
            return {
                ...parsed,
                createdAt: new Date(parsed.createdAt)
            };
        } catch (error) {
            this.logger.error({ err: error, code }, 'Cache get error');
            return null;
        }
    }

    async set(code: string, url: ShortUrl): Promise<void> {
        if (!this.isReady) {
            return;
        }

        try {
            await this.client.setex(
                `url:${code}`,
                this.ttl,
                JSON.stringify(url)
            );
        } catch (error) {
            this.logger.error({ err: error, code }, 'Cache set error');
        }
    }

    async disconnect(): Promise<void> {
        try {
            // Only quit if actually connected and ready
            if (this.client.status === 'ready') {
                await this.client.quit();
            } else {
                // Never connected or already closed - force disconnect
                this.client.disconnect();
            }
        } catch (error) {
            this.logger.error({ err: error }, 'Redis disconnect error');
            // Force disconnect as fallback
            this.client.disconnect();
        }
    }
}
