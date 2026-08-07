import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { randomUUID } from 'crypto';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: (req) => req.path === '/health',
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many OTP requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: (req) => req.path === '/health',
});

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'", process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || "'self'"].filter(Boolean) as string[],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  originAgentCluster: false,
  referrerPolicy: { policy: 'no-referrer-when-downgrade' },
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
  exposedHeaders: ['Content-Range', 'X-Total-Count', 'X-Request-Id'],
  maxAge: 86400,
});

const cacheHeaders = (req: any, res: any, next: any) => {
  if (req.method === 'GET' && req.path.startsWith('/api')) {
    res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  }
  next();
};

const requestId = (req: any, _res: any, next: any) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || randomUUID();
  next();
};

export { authLimiter, otpLimiter, generalLimiter, securityHeaders, corsOptions, requestId, cacheHeaders };
