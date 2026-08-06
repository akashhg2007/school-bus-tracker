import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { handleLocationUpdate, handleJoinRooms, handleLeaveRooms } from './handlers/location.handler';
import { handleTripEvents } from './handlers/trip.handler';
import { handleAttendanceEvents, handleEmergency } from './handlers/attendance.handler';

let io: Server;

export const initializeSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handle room joins
    handleJoinRooms(socket);
    handleLeaveRooms(socket);

    // Handle location updates
    handleLocationUpdate(socket);

    // Handle trip events
    handleTripEvents(socket);

    // Handle attendance events
    handleAttendanceEvents(socket);

    // Handle emergency
    handleEmergency(socket);

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
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
    io.to(room).emit(event, data);
  }
};

export const emitToAll = (event: string, data: any): void => {
  if (io) {
    io.emit(event, data);
  }
};
