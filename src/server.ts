import app from '@/app';
import { UrlRepository } from '@/repositories/url.repository';
import { cacheService } from '@/services/cache.service';

const PORT = process.env.PORT || 3000;

// Initialize cache connection
cacheService.connect().catch((err) => {
    console.error('Failed to initialize cache:', err);
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
        const results = await Promise.allSettled([
            UrlRepository.disconnect(),
            cacheService.disconnect()
        ]);

        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
            console.error('Errors during shutdown:', failures);
            process.exit(1);
        }

        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(async () => {
        const results = await Promise.allSettled([
            UrlRepository.disconnect(),
            cacheService.disconnect()
        ]);

        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
            console.error('Errors during shutdown:', failures);
            process.exit(1);
        }

        console.log('HTTP server closed');
        process.exit(0);
    });
});

