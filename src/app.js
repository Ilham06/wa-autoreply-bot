import express from 'express';
import adminRoutes from './routes/admin.route.js';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/admin', adminRoutes);

  return app;
}
