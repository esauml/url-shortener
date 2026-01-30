import Redis from 'ioredis';
import { ShortUrl } from '../types/url';

class CacheService {
    private client: Redis;
    private ttl: number;

    private get isReady(): boolean {
        return this.client.status === 'ready';
    }

    constructor() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const ttl = process.env.REDIS_TTL ? parseInt(process.env.REDIS_TTL, 10) : 3600;
        this.ttl = Number.isFinite(ttl) && ttl > 0 ? ttl : 3600;

        this.client = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: true,
        });

        this.client.on('ready', () => {
            console.log('Redis connected and ready');
        });

        this.client.on('error', (err) => {
            console.error('Redis error:', err.stack || err);
        });

        this.client.on('close', () => {
            console.log('Redis connection closed');
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
            console.error('Cache get error:', error);
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
            console.error('Cache set error:', error);
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
            console.error('Redis disconnect error:', error);
            // Force disconnect as fallback
            this.client.disconnect();
        }
    }
}

export const cacheService = new CacheService();
