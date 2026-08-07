import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { handleLocationUpdate, handleJoinRooms, handleLeaveRooms } from './handlers/location.handler';
import { handleTripEvents } from './handlers/trip.handler';
import { handleAttendanceEvents, handleEmergency } from './handlers/attendance.handler';
import { verifyToken, AuthPayload } from '../middleware/auth';
import { logger } from '../utils/logger';

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

export const initializeSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: allowedSocketOrigins.length > 0 ? allowedSocketOrigins : undefined,
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 64 * 1024,
    pingTimeout: 30000,
    pingInterval: 20000,
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
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
