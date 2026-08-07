import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { handleLocationUpdate, handleJoinRooms, handleLeaveRooms } from './handlers/location.handler';
import { handleTripEvents } from './handlers/trip.handler';
import { handleAttendanceEvents, handleEmergency } from './handlers/attendance.handler';
import { verifyToken, AuthPayload } from '../middleware/auth';

let io: Server;

const allowedSocketOrigins = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export const initializeSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: allowedSocketOrigins.length > 0 ? allowedSocketOrigins : undefined,
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 1e6,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
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
      console.log(`Client connected: ${socket.id}`);
    }

    handleJoinRooms(socket);
    handleLeaveRooms(socket);
    handleLocationUpdate(socket);
    handleTripEvents(socket);
    handleAttendanceEvents(socket);
    handleEmergency(socket);

    socket.on('disconnect', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Client disconnected: ${socket.id}`);
      }
    });
  });

  console.log('Socket.IO initialized successfully');
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
        console.error(`Failed to emit to room ${room}:`, error);
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
        console.error(`Failed to emit event ${event}:`, error);
      }
    }
  }
};
