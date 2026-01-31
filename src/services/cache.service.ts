import Redis from 'ioredis';
import { ShortUrl } from '@/types/url';

export class CacheService {
    private client: Redis;
    private ttl: number;

    private get isReady(): boolean {
        return this.client.status === 'ready';
    }

    constructor(client: Redis, ttl: number) {
        this.client = client;
        this.ttl = ttl;

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
