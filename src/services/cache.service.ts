import Redis from 'ioredis';
import { ShortUrl } from '../types/url';

class CacheService {
    private client: Redis;
    private ttl: number = 3600; // 1 hour in seconds
    private isConnected: boolean = false;

    constructor() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

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

            return JSON.parse(cached) as ShortUrl;
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
