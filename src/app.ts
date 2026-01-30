import express from 'express';

import urlRouter from '@/routes/url.routes';
import { errorHandler, requestIdMiddleware } from '@/middleware/errorHandler';

const app = express();

// Add request ID to each request for tracing
app.use(requestIdMiddleware);

app.use(express.json());

// health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.use('/', urlRouter);

// Global error handling middleware (must be last)
app.use(errorHandler);

export default app;