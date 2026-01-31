import express from 'express';

import urlRouter from '@/routes/url.routes';
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';

const app = express();

// Add request logger with request ID tracing (must be before routes)
app.use(requestLogger);

app.use(express.json());

// health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.use('/', urlRouter);

// Global error handling middleware (must be last)
app.use(errorHandler);

export default app;