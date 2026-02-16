import adminRoutes from './admin.route.js';
import waRoutes from './wa.route.js';
import authRoutes from './auth.route.js';
import configRoutes from './config.route.js';

export function registerRoutes(app) {
  app.use('/admin', adminRoutes);
  app.use('/api/wa', waRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/config', configRoutes);
}
