import app from '@/app';
import { container } from '@/container';
import { config } from '@/config';

const PORT = config.port;

// Initialize cache connection
container.cacheService.connect().catch((err) => {
    console.error('Failed to initialize cache:', err);
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown handler factory
const handleGracefulShutdown = (signal: string) => async () => {
    console.log(`${signal} signal received: closing HTTP server`);
    server.close(async () => {
        const results = await Promise.allSettled([
            container.urlRepository.disconnect(),
            container.cacheService.disconnect()
        ]);

        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
            console.error('Errors during shutdown:', failures);
            process.exit(1);
        }

        console.log('HTTP server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', handleGracefulShutdown('SIGINT'));

