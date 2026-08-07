import * as Sentry from '@sentry/node';
import { Express, Request, Response, NextFunction } from 'express';

export const initSentry = (app: Express): void => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.log('Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      if (event.request?.data) {
        const data = event.request.data as Record<string, any>;
        const sensitiveFields = ['password', 'token', 'otp', 'secret'];
        for (const field of sensitiveFields) {
          if (data[field]) {
            data[field] = '[REDACTED]';
          }
        }
      }
      return event;
    },
  });
};

export const sentryErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
  next(err);
};

export const captureException = (error: Error, context?: Record<string, any>): void => {
  if (process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        for (const [key, value] of Object.entries(context)) {
          scope.setExtra(key, value);
        }
      }
      Sentry.captureException(error);
    });
  }
};
