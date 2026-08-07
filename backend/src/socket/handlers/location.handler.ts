import { Socket } from 'socket.io';
import { updateLocation } from '../../modules/location/location.service';
import { verifyToken } from '../../middleware/auth';
import { AuthPayload } from '../../middleware/auth';
import prisma from '../../config/database';

const getUser = (socket: Socket): AuthPayload | null => (socket.data?.user as AuthPayload) || null;

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
    console.error('join:bus authorization error', error);
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

      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: { bus: { select: { driverId: true } } },
      });

      if (!trip || trip.bus.driverId !== user.userId) {
        socket.emit('error', { message: 'Not authorized for this trip' });
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
  socket.on('join:bus', async (busId: string) => {
    if (!(await canJoinBus(socket, busId))) {
      socket.emit('error', { message: 'Not authorized to join this bus room' });
      return;
    }
    socket.join(`bus:${busId}`);
    console.log(`Socket ${socket.id} joined room bus:${busId}`);
  });

  socket.on('join:school', async (schoolId: string) => {
    const user = getUser(socket);
    if (!user || user.schoolId !== schoolId) {
      socket.emit('error', { message: 'Not authorized to join this school room' });
      return;
    }
    socket.join(`school:${schoolId}`);
    console.log(`Socket ${socket.id} joined room school:${schoolId}`);
  });

  socket.on('join:parent', async (parentId: string) => {
    if (!(await canJoinParent(socket, parentId))) {
      socket.emit('error', { message: 'Not authorized to join this parent room' });
      return;
    }
    socket.join(`parent:${parentId}`);
    console.log(`Socket ${socket.id} joined room parent:${parentId}`);
  });

  socket.on('join:driver', async (driverId: string) => {
    if (!(await canJoinDriver(socket, driverId))) {
      socket.emit('error', { message: 'Not authorized to join this driver room' });
      return;
    }
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
