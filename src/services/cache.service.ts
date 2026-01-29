import Redis from 'ioredis';
import { ShortUrl } from '../types/url';

class CacheService {
    private client: Redis;
    private ttl: number;
    private isConnected: boolean = false;

    constructor() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const ttl = process.env.REDIS_TTL ? parseInt(process.env.REDIS_TTL, 10) : 3600;
        this.ttl = Number.isFinite(ttl) && ttl > 0 ? ttl : 3600;

        this.client = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: true,
        });

        this.client.on('connect', () => {
            this.isConnected = true;
            console.log('Redis connected');
        });

        this.client.on('error', (err) => {
            this.isConnected = false;
            console.error('Redis error:', err.message);
        });

        this.client.on('close', () => {
            this.isConnected = false;
            console.log('Redis connection closed');
        });
    }

    async connect(): Promise<void> {
        try {
            await this.client.connect();
        } catch (error) {
            console.error('Failed to connect to Redis:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async get(code: string): Promise<ShortUrl | null> {
        if (!this.isConnected) {
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
        if (!this.isConnected) {
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
            await this.client.quit();
        } catch (error) {
            console.error('Redis disconnect error:', error);
        }
    }
}

export const cacheService = new CacheService();
