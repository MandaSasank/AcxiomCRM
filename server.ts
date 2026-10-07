import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { authMiddleware } from './src/server/middleware/authMiddleware.ts';
import authRoutes from './src/server/routes/authRoutes.ts';
import customerRoutes from './src/server/routes/customerRoutes.ts';
import leadRoutes from './src/server/routes/leadRoutes.ts';
import opportunityRoutes from './src/server/routes/opportunityRoutes.ts';
import followupRoutes from './src/server/routes/followupRoutes.ts';
import activityRoutes from './src/server/routes/activityRoutes.ts';
import dashboardRoutes from './src/server/routes/dashboardRoutes.ts';
import reportRoutes from './src/server/routes/reportRoutes.ts';
import auditRoutes from './src/server/routes/auditRoutes.ts';
import testRoutes from './src/server/routes/testRoutes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsing and security middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Attach authentication context
  app.use(authMiddleware);

  // REST API Route Registration (Section 10 & 17.14)
  app.use('/api/auth', authRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/leads', leadRoutes);
  app.use('/api/opportunities', opportunityRoutes);
  app.use('/api/followups', followupRoutes);
  app.use('/api/activities', activityRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/audit-logs', auditRoutes);
  app.use('/api/tests', testRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Vite integration: Dev vs Production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AcxiomCRM] Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start AcxiomCRM server:', err);
  process.exit(1);
});
