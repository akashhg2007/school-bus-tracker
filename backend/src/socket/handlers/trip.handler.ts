import { Socket } from 'socket.io';
import { startTrip, endTrip } from '../../modules/trip/trip.service';
import prisma from '../../config/database';

const isDriver = (socket: Socket): string | null => {
  const user = socket.data?.user as { userId?: string; userType?: string } | undefined;
  if (user && user.userType === 'DRIVER' && user.userId) {
    return user.userId;
  }
  return null;
};

export const handleTripEvents = (socket: Socket) => {
  socket.on('driver:start-trip', async (data) => {
    try {
      const driverId = isDriver(socket);
      if (!driverId) {
        socket.emit('error', { message: 'Only authenticated drivers can start trips' });
        return;
      }

      const { busId, type } = data;

      if (!busId || !type) {
        socket.emit('error', { message: 'Missing required fields: busId, type' });
        return;
      }

      const bus = await prisma.bus.findUnique({
        where: { id: busId },
        select: { id: true, driverId: true },
      });

      if (!bus || bus.driverId !== driverId) {
        socket.emit('error', { message: 'Not authorized for this bus' });
        return;
      }

      const trip = await startTrip({ busId, driverId, type });
      socket.emit('trip:started', trip);
    } catch (error: any) {
      console.error('Start trip error:', error);
      socket.emit('error', { message: error.message || 'Failed to start trip' });
    }
  });

  socket.on('driver:end-trip', async (data) => {
    try {
      const driverId = isDriver(socket);
      if (!driverId) {
        socket.emit('error', { message: 'Only authenticated drivers can end trips' });
        return;
      }

      const { tripId } = data;

      if (!tripId) {
        socket.emit('error', { message: 'Missing required field: tripId' });
        return;
      }

      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: { bus: { select: { driverId: true } } },
      });

      if (!trip || trip.bus.driverId !== driverId) {
        socket.emit('error', { message: 'Not authorized for this trip' });
        return;
      }

      const endedTrip = await endTrip(tripId);
      socket.emit('trip:ended', endedTrip);
    } catch (error: any) {
      console.error('End trip error:', error);
      socket.emit('error', { message: error.message || 'Failed to end trip' });
    }
  });
};
