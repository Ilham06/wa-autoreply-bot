import express from 'express';
import cors from 'cors';
import { registerRoutes } from './routes/index.js';
import { env } from './config/app.js';

export function createApp() {
  const app = express();
  app.use(cors({
    origin: env.frontendUrl || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json());

  app.get('/health', (_, res) => {
    res.json({ status: 'ok' });
  });

  registerRoutes(app);

  return app;
}
