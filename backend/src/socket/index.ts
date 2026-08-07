import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { handleLocationUpdate, handleJoinRooms, handleLeaveRooms } from './handlers/location.handler';
import { handleTripEvents } from './handlers/trip.handler';
import { handleAttendanceEvents, handleEmergency } from './handlers/attendance.handler';
import { verifyToken, AuthPayload } from '../middleware/auth';
import { logger } from '../utils/logger';
import cookieParser from 'cookie-parser';

let io: Server;

const allowedSocketOrigins = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// WebSocket connection rate limiting
const wsConnectionCounts = new Map<string, { count: number; resetAt: number }>();
const WS_MAX_CONNECTIONS = 5;
const WS_WINDOW_MS = 60 * 1000;

const isWsRateLimited = (ip: string): boolean => {
  const now = Date.now();
  const entry = wsConnectionCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    wsConnectionCounts.set(ip, { count: 1, resetAt: now + WS_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > WS_MAX_CONNECTIONS;
};

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of wsConnectionCounts) {
    if (now > entry.resetAt) wsConnectionCounts.delete(key);
  }
}, 60 * 1000);

// Parse token from auth header or cookie
const extractToken = (socket: Socket): string | null => {
  // 1. Check auth.token (mobile clients)
  if (socket.handshake.auth?.token) {
    return socket.handshake.auth.token;
  }

  // 2. Check Authorization header
  const authHeader = socket.handshake.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  // 3. Check cookie (web dashboard)
  const cookieHeader = socket.handshake.headers?.cookie;
  if (cookieHeader) {
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach((c) => {
      const [key, ...rest] = c.trim().split('=');
      cookies[key] = rest.join('=');
    });
    if (cookies.sb_token) {
      return cookies.sb_token;
    }
  }

  return null;
};

export const initializeSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: allowedSocketOrigins.length > 0 ? allowedSocketOrigins : undefined,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    maxHttpBufferSize: 64 * 1024,
    pingTimeout: 30000,
    pingInterval: 20000,
  });

  io.use((socket: Socket, next) => {
    const token = extractToken(socket);
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const clientIp = socket.handshake.address || 'unknown';
    if (isWsRateLimited(clientIp)) {
      return next(new Error('Too many connections, try again later'));
    }

    try {
      const payload = verifyToken(token) as AuthPayload;
      socket.data.user = payload;
      next();
    } catch (error) {
      next(new Error('Invalid authentication'));
    }
  });

  io.on('connection', (socket: Socket) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`Client connected: ${socket.id}`);
    }

    handleJoinRooms(socket);
    handleLeaveRooms(socket);
    handleLocationUpdate(socket);
    handleTripEvents(socket);
    handleAttendanceEvents(socket);
    handleEmergency(socket);

    socket.on('disconnect', () => {
      if (process.env.NODE_ENV !== 'production') {
        logger.debug(`Client disconnected: ${socket.id}`);
      }
    });
  });

  logger.info('Socket.IO initialized successfully');
  return io;
};

export const getSocketIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

export const emitToRoom = (room: string, event: string, data: any): void => {
  if (io) {
    try {
      io.to(room).emit(event, data);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        logger.error(`Failed to emit to room ${room}`);
      }
    }
  }
};

export const emitToAll = (event: string, data: any): void => {
  if (io) {
    try {
      io.emit(event, data);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        logger.error(`Failed to emit event ${event}`);
      }
    }
  }
};
