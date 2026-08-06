import { Socket } from 'socket.io';
import { startTrip, endTrip } from '../../modules/trip/trip.service';
import { verifyToken, AuthPayload } from '../../middleware/auth';

export const handleTripEvents = (socket: Socket) => {
  socket.on('driver:start-trip', async (data) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const decoded = verifyToken(token) as AuthPayload;
      if (decoded.userType !== 'DRIVER') {
        socket.emit('error', { message: 'Only drivers can start trips' });
        return;
      }

      const { busId, type } = data;
      const driverId = decoded.userId;

      const trip = await startTrip({ busId, driverId, type });
      socket.emit('trip:started', trip);
    } catch (error: any) {
      console.error('Start trip error:', error);
      socket.emit('error', { message: error.message || 'Failed to start trip' });
    }
  });

  socket.on('driver:end-trip', async (data) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const decoded = verifyToken(token) as AuthPayload;
      if (decoded.userType !== 'DRIVER') {
        socket.emit('error', { message: 'Only drivers can end trips' });
        return;
      }

      const { tripId } = data;
      const trip = await endTrip(tripId);
      socket.emit('trip:ended', trip);
    } catch (error: any) {
      console.error('End trip error:', error);
      socket.emit('error', { message: error.message || 'Failed to end trip' });
    }
  });
};
