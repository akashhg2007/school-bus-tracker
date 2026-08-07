import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { randomUUID } from 'crypto';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts, please try again later.' } },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: (req) => req.path === '/health',
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many OTP requests, please try again later.' } },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: (req) => req.path === '/health',
});

// Strict limiter for location updates (1 per 5 seconds per user)
const locationLimiter = rateLimit({
  windowMs: 5 * 1000,
  max: 1,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Location update too frequent.' } },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  keyGenerator: (req: any) => req.user?.id || req.ip,
});

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || "'self'"].filter(Boolean) as string[],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  originAgentCluster: false,
  referrerPolicy: { policy: 'no-referrer-when-downgrade' },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  xDnsPrefetchControl: false,
  xFrameOptions: { action: 'sameorigin' },
  xDownloadOptions: false,
  xPermittedCrossDomainPolicies: false,
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['Content-Range', 'X-Total-Count', 'X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
});

const cacheHeaders = (req: any, res: any, next: any) => {
  if (req.method === 'GET' && req.path.startsWith('/api')) {
    // Cache static-ish data for 30s, dynamic data no-cache
    const cacheablePaths = ['/buses', '/drivers', '/routes', '/students'];
    const isCacheable = cacheablePaths.some(p => req.path === p || req.path === `${p}/`);
    if (isCacheable) {
      res.set('Cache-Control', 'private, max-age=30');
    } else {
      res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    }
  }
  next();
};

const requestId = (req: any, _res: any, next: any) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || randomUUID();
  next();
};

export { authLimiter, otpLimiter, generalLimiter, locationLimiter, securityHeaders, corsOptions, requestId, cacheHeaders };
