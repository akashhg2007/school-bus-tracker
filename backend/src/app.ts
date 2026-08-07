import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { initializeFirebase } from './config/firebase';
import { initializeSocket } from './socket';
import { AppError } from './utils/errors';
import { securityHeaders, generalLimiter, authLimiter, corsOptions } from './middleware/security';
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

// Middleware
app.use(securityHeaders);
app.use(corsOptions);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
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
  // SPA fallback for client-side routing (skip /api and /health)
  app.get(/^\/(?!api\/|health).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log(`Serving admin dashboard from ${clientDist}`);
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Firebase (optional - skip if not configured)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    initializeFirebase();
    console.log('Firebase configured - FCM will initialize on first push');
  } catch (error) {
    console.warn('Firebase initialization skipped (configure in .env)');
  }
} else {
  console.log('Firebase not configured - running in dev mode');
}

// Initialize Socket.IO
initializeSocket(httpServer);

// Start server
const server = httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down gracefully...`);
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
