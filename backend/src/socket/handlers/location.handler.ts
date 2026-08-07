import { Socket } from 'socket.io';
import { updateLocation } from '../../modules/location/location.service';
import { AuthPayload } from '../../middleware/auth';
import prisma from '../../config/database';

const getUser = (socket: Socket): AuthPayload | null => (socket.data?.user as AuthPayload) || null;

const isValidLatitude = (lat: any): boolean => typeof lat === 'number' && lat >= -90 && lat <= 90;
const isValidLongitude = (lng: any): boolean => typeof lng === 'number' && lng >= -180 && lng <= 180;

const canJoinBus = async (socket: Socket, busId: string): Promise<boolean> => {
  const user = getUser(socket);
  if (!user) return false;

  try {
    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      select: { id: true, schoolId: true, driverId: true },
    });
    if (!bus) return false;

    if (user.userType === 'ADMIN') {
      return bus.schoolId === user.schoolId;
    }
    if (user.userType === 'DRIVER') {
      return bus.driverId === user.userId;
    }
    if (user.userType === 'PARENT') {
      const student = await prisma.student.findFirst({
        where: { busId: bus.id, parentId: user.userId },
        select: { id: true },
      });
      return !!student;
    }
    return false;
  } catch (error) {
    return false;
  }
};

const canJoinParent = async (socket: Socket, parentId: string): Promise<boolean> => {
  const user = getUser(socket);
  if (!user) return false;
  if (user.userType === 'PARENT') {
    return user.userId === parentId;
  }
  if (user.userType === 'ADMIN') {
    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      select: { schoolId: true },
    });
    return !!parent && parent.schoolId === user.schoolId;
  }
  return false;
};

const canJoinDriver = async (socket: Socket, driverId: string): Promise<boolean> => {
  const user = getUser(socket);
  if (!user) return false;
  if (user.userType === 'DRIVER') {
    return user.userId === driverId;
  }
  if (user.userType === 'ADMIN') {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { schoolId: true },
    });
    return !!driver && driver.schoolId === user.schoolId;
  }
  return false;
};

export const handleLocationUpdate = (socket: Socket) => {
  socket.on('driver:location-update', async (data) => {
    try {
      const user = getUser(socket);
      if (!user || user.userType !== 'DRIVER') {
        socket.emit('error', { message: 'Only drivers can send location updates' });
        return;
      }

      const { tripId, latitude, longitude, speed, heading, accuracy } = data;

      if (!tripId || latitude === undefined || longitude === undefined) {
        socket.emit('error', { message: 'Missing required fields: tripId, latitude, longitude' });
        return;
      }

      if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
        socket.emit('error', { message: 'Invalid GPS coordinates' });
        return;
      }

      if (speed !== undefined && (typeof speed !== 'number' || speed < 0 || speed > 200)) {
        socket.emit('error', { message: 'Invalid speed value' });
        return;
      }

      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: { bus: { select: { driverId: true } } },
      });

      if (!trip || trip.bus.driverId !== user.userId) {
        socket.emit('error', { message: 'Not authorized for this trip' });
        return;
      }

      if (trip.status !== 'IN_PROGRESS') {
        socket.emit('error', { message: 'Trip is not in progress' });
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
      socket.emit('error', { message: 'Failed to update location' });
    }
  });
};

export const handleJoinRooms = (socket: Socket) => {
  socket.on('join:bus', async (busId: string) => {
    if (!(await canJoinBus(socket, busId))) {
      socket.emit('error', { message: 'Not authorized to join this bus room' });
      return;
    }
    socket.join(`bus:${busId}`);
  });

  socket.on('join:school', async (schoolId: string) => {
    const user = getUser(socket);
    if (!user || user.schoolId !== schoolId) {
      socket.emit('error', { message: 'Not authorized to join this school room' });
      return;
    }
    socket.join(`school:${schoolId}`);
  });

  socket.on('join:parent', async (parentId: string) => {
    if (!(await canJoinParent(socket, parentId))) {
      socket.emit('error', { message: 'Not authorized to join this parent room' });
      return;
    }
    socket.join(`parent:${parentId}`);
  });

  socket.on('join:driver', async (driverId: string) => {
    if (!(await canJoinDriver(socket, driverId))) {
      socket.emit('error', { message: 'Not authorized to join this driver room' });
      return;
    }
    socket.join(`driver:${driverId}`);
  });
};

export const handleLeaveRooms = (socket: Socket) => {
  socket.on('leave:bus', (busId: string) => {
    const user = getUser(socket);
    if (!user) return;
    socket.leave(`bus:${busId}`);
  });

  socket.on('leave:school', (schoolId: string) => {
    const user = getUser(socket);
    if (!user || user.schoolId !== schoolId) return;
    socket.leave(`school:${schoolId}`);
  });
};
