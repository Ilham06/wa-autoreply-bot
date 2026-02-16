import express from 'express';
import { registerRoutes } from './routes/index.js';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_, res) => {
    res.json({ status: 'ok' });
  });

  registerRoutes(app);

  return app;
}
