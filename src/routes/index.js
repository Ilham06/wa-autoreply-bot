import adminRoutes from './admin.route.js';
import waRoutes from './wa.route.js';

export function registerRoutes(app) {
  app.use('/admin', adminRoutes);
  app.use('/api/wa', waRoutes);
}
