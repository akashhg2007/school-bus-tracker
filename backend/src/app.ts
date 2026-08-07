import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import fs from 'fs';
import path from 'path';
import cookieParser from 'cookie-parser';
import { logger } from './utils/logger';
import { auditLog } from './middleware/audit';
import { initializeFirebase } from './config/firebase';
import { initializeSocket } from './socket';
import { AppError } from './utils/errors';
import { securityHeaders, generalLimiter, authLimiter, otpLimiter, corsOptions, requestId, cacheHeaders } from './middleware/security';
import { initSentry, sentryErrorHandler } from './config/sentry';
import prisma from './config/database';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import busRoutes from './modules/bus/bus.routes';
import driverRoutes from './modules/driver/driver.routes';
import studentRoutes from './modules/student/student.routes';
import routeRoutes from './modules/route/route.routes';
import tripRoutes from './modules/trip/trip.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import locationRoutes from './modules/location/location.routes';
import notificationRoutes from './modules/notification/notification.routes';
import leaveRoutes from './modules/leave/leave.routes';
import announcementRoutes from './modules/announcement/announcement.routes';
import maintenanceRoutes from './modules/maintenance/maintenance.routes';
import parentRoutes from './modules/parent/parent.routes';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Sentry (must be before other middleware)
initSentry(app);

// Trust proxy (needed for rate limiter on Render)
app.set('trust proxy', process.env.TRUST_PROXY || 1);

// Middleware
app.use(requestId);
app.use(securityHeaders);
app.use(cookieParser());
app.use(corsOptions);
app.use(cacheHeaders);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api/auth/send-otp', otpLimiter);
app.use('/api', generalLimiter);

// Request timeout (30s for API, 60s for location updates)
app.use('/api', (req, res, next) => {
  const timeout = req.path === '/location/update' ? 60000 : 30000;
  req.setTimeout(timeout, () => {
    res.status(408).json({ success: false, error: { code: 'REQUEST_TIMEOUT', message: 'Request timed out' } });
  });
  next();
});

// Health check endpoint
app.get('/health', async (_req, res) => {
  const checks: Record<string, string> = { status: 'ok', timestamp: new Date().toISOString() };
  let dbOk = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'connected';
  } catch (e) {
    checks.database = 'disconnected';
    checks.status = 'degraded';
    dbOk = false;
  }
  res.status(dbOk ? 200 : 503).json(checks);
});

// Audit logging for sensitive operations
app.use('/api', auditLog);

// API Routes (v1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/buses', busRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/routes', routeRoutes);
app.use('/api/v1/trips', tripRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/location', locationRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/leaves', leaveRoutes);
app.use('/api/v1/announcements', announcementRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/parents', parentRoutes);

// Backward compatibility: /api/* → /api/v1/*
app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/parents', parentRoutes);

// Serve admin dashboard (built SPA) if present
const clientDist = path.join(__dirname, '..', '..', 'admin-dashboard', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/|health).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  logger.info(`Serving admin dashboard from ${clientDist}`);
}

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Sentry error handler (must be before other error handlers)
app.use(sentryErrorHandler);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const requestId = (req as any).headers?.['x-request-id'] || 'unknown';

  if (err.type === 'entity.too.large') {
    res.status(413).json({
      success: false,
      message: 'Request payload too large',
      requestId,
    });
    return;
  }

  if (err instanceof AppError) {
    console.error(`[${requestId}] Error ${err.statusCode}: ${err.message}`);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      requestId,
    });
    return;
  }

  console.error(`[${requestId}] Unhandled error: ${err.message}`);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    requestId,
  });
});

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Firebase (optional - skip if not configured)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    initializeFirebase();
    logger.info('Firebase configured - FCM will initialize on first push');
  } catch (error) {
    logger.warn('Firebase initialization skipped (configure in .env)');
  }
} else {
  logger.info('Firebase not configured - running in dev mode');
}

// Initialize Socket.IO
initializeSocket(httpServer);

// Start server
const server = httpServer.listen(Number(PORT), '0.0.0.0', () => {
  logger.info(`Server running on http://0.0.0.0:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

const shutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (e) {
      console.error('Error disconnecting from database', e);
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
