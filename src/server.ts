import app from '@/app';
import { container } from '@/container';
import { config } from '@/config';
import { logger } from '@/logger';

const PORT = config.port;

// Initialize cache connection
container.cacheService.connect().catch((err) => {
    logger.error({ err }, 'Failed to initialize cache');
});

const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server is running');
});

// Graceful shutdown handler factory
const handleGracefulShutdown = (signal: string) => async () => {
    logger.info({ signal }, 'Shutdown signal received, closing HTTP server');
    server.close(async () => {
        const results = await Promise.allSettled([
            container.urlRepository.disconnect(),
            container.cacheService.disconnect()
        ]);

        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
            logger.error({ failures }, 'Errors during shutdown');
            process.exit(1);
        }

        logger.info('HTTP server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', handleGracefulShutdown('SIGINT'));

