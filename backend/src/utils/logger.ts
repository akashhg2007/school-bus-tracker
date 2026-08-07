const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
  info: (msg: string, meta?: Record<string, any>) => {
    if (!isProduction || meta) {
      console.log(JSON.stringify({ level: 'info', msg, ...meta, timestamp: new Date().toISOString() }));
    } else {
      console.log(`[INFO] ${msg}`);
    }
  },
  warn: (msg: string, meta?: Record<string, any>) => {
    console.warn(JSON.stringify({ level: 'warn', msg, ...meta, timestamp: new Date().toISOString() }));
  },
  error: (msg: string, meta?: Record<string, any>) => {
    console.error(JSON.stringify({ level: 'error', msg, ...meta, timestamp: new Date().toISOString() }));
  },
  debug: (msg: string, meta?: Record<string, any>) => {
    if (!isProduction) {
      console.log(JSON.stringify({ level: 'debug', msg, ...meta, timestamp: new Date().toISOString() }));
    }
  },
};
