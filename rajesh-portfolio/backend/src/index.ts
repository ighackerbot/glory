import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import subscriptionRoutes from './routes/subscriptions';
import scoreRoutes from './routes/scores';
import drawRoutes from './routes/draws';
import charityRoutes from './routes/charities';
import winnerRoutes from './routes/winners';
import userDashboardRoutes from './routes/userDashboard';
import adminDashboardRoutes from './routes/adminDashboard';

const app = express();
const PORT = process.env.PORT || 3001;

// ==========================================
// Middleware
// ==========================================
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ==========================================
// Health check
// ==========================================
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    name: 'Golf Charity Subscription Platform API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// API Routes
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/draws', drawRoutes);
app.use('/api/charities', charityRoutes);
app.use('/api/winners', winnerRoutes);
app.use('/api/dashboard/user', userDashboardRoutes);
app.use('/api/dashboard/admin', adminDashboardRoutes);

// ==========================================
// API Documentation endpoint
// ==========================================
app.get('/api', (_req, res) => {
  res.json({
    name: 'Golf Charity Subscription Platform API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
      },
      subscriptions: {
        get: 'GET /api/subscriptions',
        create: 'POST /api/subscriptions',
        cancel: 'PUT /api/subscriptions/cancel',
        renew: 'PUT /api/subscriptions/renew',
      },
      scores: {
        list: 'GET /api/scores',
        add: 'POST /api/scores',
        delete: 'DELETE /api/scores/:id',
      },
      draws: {
        list: 'GET /api/draws',
        get: 'GET /api/draws/:id',
        create: 'POST /api/draws (admin)',
        enter: 'POST /api/draws/:id/enter',
        execute: 'POST /api/draws/:id/execute (admin)',
        simulate: 'POST /api/draws/:id/simulate (admin)',
        publish: 'PUT /api/draws/:id/publish (admin)',
      },
      charities: {
        list: 'GET /api/charities',
        featured: 'GET /api/charities/featured',
        get: 'GET /api/charities/:id',
        create: 'POST /api/charities (admin)',
        update: 'PUT /api/charities/:id (admin)',
        delete: 'DELETE /api/charities/:id (admin)',
        selectForUser: 'PUT /api/charities/user/select',
      },
      winners: {
        list: 'GET /api/winners (admin)',
        myWinnings: 'GET /api/winners/my',
        uploadProof: 'POST /api/winners/:id/verify',
        review: 'PUT /api/winners/:id/review (admin)',
        payout: 'PUT /api/winners/:id/payout (admin)',
      },
      dashboards: {
        user: 'GET /api/dashboard/user',
        adminStats: 'GET /api/dashboard/admin/stats',
        adminUsers: 'GET /api/dashboard/admin/users',
        editUser: 'PUT /api/dashboard/admin/users/:id',
        editSubscription: 'PUT /api/dashboard/admin/users/:id/subscription',
      },
    },
  });
});

// ==========================================
// 404 handler
// ==========================================
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ==========================================
// Error handler
// ==========================================
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ==========================================
// Start server
// ==========================================
app.listen(PORT, () => {
  console.log(`\n🏌️ Golf Charity Subscription Platform API`);
  console.log(`   Server running on http://localhost:${PORT}`);
  console.log(`   API docs: http://localhost:${PORT}/api`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});

export default app;
