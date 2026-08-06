import { Socket } from 'socket.io';
import { updateLocation } from '../../modules/location/location.service';
import { verifyToken } from '../../middleware/auth';
import { AuthPayload } from '../../middleware/auth';

export const handleLocationUpdate = (socket: Socket) => {
  socket.on('driver:location-update', async (data) => {
    try {
      // Verify driver authentication
      const token = socket.handshake.auth.token;
      if (!token) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const decoded = verifyToken(token) as AuthPayload;
      if (decoded.userType !== 'DRIVER') {
        socket.emit('error', { message: 'Only drivers can send location updates' });
        return;
      }

      const { tripId, latitude, longitude, speed, heading, accuracy } = data;

      if (!tripId || latitude === undefined || longitude === undefined) {
        socket.emit('error', { message: 'Missing required fields: tripId, latitude, longitude' });
        return;
      }

      await updateLocation(tripId, {
        latitude,
        longitude,
        speed,
        heading,
        accuracy,
      });

      socket.emit('location-update-success', { timestamp: new Date() });
    } catch (error) {
      console.error('Location update error:', error);
      socket.emit('error', { message: 'Failed to update location' });
    }
  });
};

export const handleJoinRooms = (socket: Socket) => {
  socket.on('join:bus', (busId: string) => {
    socket.join(`bus:${busId}`);
    console.log(`Socket ${socket.id} joined room bus:${busId}`);
  });

  socket.on('join:school', (schoolId: string) => {
    socket.join(`school:${schoolId}`);
    console.log(`Socket ${socket.id} joined room school:${schoolId}`);
  });

  socket.on('join:parent', (parentId: string) => {
    socket.join(`parent:${parentId}`);
    console.log(`Socket ${socket.id} joined room parent:${parentId}`);
  });

  socket.on('join:driver', (driverId: string) => {
    socket.join(`driver:${driverId}`);
    console.log(`Socket ${socket.id} joined room driver:${driverId}`);
  });
};

export const handleLeaveRooms = (socket: Socket) => {
  socket.on('leave:bus', (busId: string) => {
    socket.leave(`bus:${busId}`);
    console.log(`Socket ${socket.id} left room bus:${busId}`);
  });

  socket.on('leave:school', (schoolId: string) => {
    socket.leave(`school:${schoolId}`);
    console.log(`Socket ${socket.id} left room school:${schoolId}`);
  });
};
