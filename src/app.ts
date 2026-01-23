import express from 'express';

import urlRouter from './routes/url.routes';

const app = express();

app.use(express.json());

// health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.use('/', urlRouter);

export default app;