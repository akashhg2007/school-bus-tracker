import { Socket } from 'socket.io';
import { markAttendance } from '../../modules/attendance/attendance.service';
import prisma from '../../config/database';
import { AttendanceType, TripStatus } from '@prisma/client';

const getAuth = (socket: Socket): { userId?: string; userType?: string; schoolId?: string } =>
  (socket.data?.user as { userId?: string; userType?: string; schoolId?: string }) || {};

const canMarkForTrip = async (
  driverId: string,
  tripId: string,
): Promise<boolean> => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { bus: { select: { driverId: true } } },
  });
  return !!trip && trip.bus.driverId === driverId && trip.status === TripStatus.IN_PROGRESS;
};

export const handleAttendanceEvents = (socket: Socket) => {
  socket.on('driver:student-boarding', async (data) => {
    try {
      const auth = getAuth(socket);
      if (auth.userType !== 'DRIVER' || !auth.userId) {
        socket.emit('error', { message: 'Only authenticated drivers can mark attendance' });
        return;
      }

      const { studentId, tripId } = data;

      if (!studentId || !tripId) {
        socket.emit('error', { message: 'Missing required fields: studentId, tripId' });
        return;
      }

      if (!(await canMarkForTrip(auth.userId, tripId))) {
        socket.emit('error', { message: 'Not authorized for this trip' });
        return;
      }

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { bus: { select: { driverId: true } } },
      });

      if (!student || !student.bus || student.bus.driverId !== auth.userId) {
        socket.emit('error', { message: 'Not authorized for this student' });
        return;
      }

      const attendance = await markAttendance({
        studentId,
        tripId,
        type: AttendanceType.BOARDING,
        markedBy: auth.userId,
      });

      socket.emit('attendance:marked', attendance);
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to mark attendance' });
    }
  });

  socket.on('driver:student-drop', async (data) => {
    try {
      const auth = getAuth(socket);
      if (auth.userType !== 'DRIVER' || !auth.userId) {
        socket.emit('error', { message: 'Only authenticated drivers can mark attendance' });
        return;
      }

      const { studentId, tripId } = data;

      if (!studentId || !tripId) {
        socket.emit('error', { message: 'Missing required fields: studentId, tripId' });
        return;
      }

      if (!(await canMarkForTrip(auth.userId, tripId))) {
        socket.emit('error', { message: 'Not authorized for this trip' });
        return;
      }

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { bus: { select: { driverId: true } } },
      });

      if (!student || !student.bus || student.bus.driverId !== auth.userId) {
        socket.emit('error', { message: 'Not authorized for this student' });
        return;
      }

      const attendance = await markAttendance({
        studentId,
        tripId,
        type: AttendanceType.DROPOFF,
        markedBy: auth.userId,
      });

      socket.emit('attendance:marked', attendance);
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to mark attendance' });
    }
  });
};

export const handleEmergency = (socket: Socket) => {
  socket.on('driver:emergency', async (data) => {
    try {
      const auth = getAuth(socket);
      if (auth.userType !== 'DRIVER' || !auth.userId) {
        socket.emit('error', { message: 'Only authenticated drivers can trigger emergency' });
        return;
      }

      const { tripId, message } = data;

      if (tripId && !(await canMarkForTrip(auth.userId, tripId))) {
        socket.emit('error', { message: 'Not authorized for this trip' });
        return;
      }

      if (!auth.schoolId) {
        socket.emit('error', { message: 'School not identified' });
        return;
      }

      socket.to(`school:${auth.schoolId}`).emit('fleet:emergency-alert', {
        tripId,
        driverId: auth.userId,
        message: message || 'Emergency triggered by driver',
        timestamp: new Date(),
      });

      socket.emit('emergency:acknowledged', { timestamp: new Date() });
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to trigger emergency' });
    }
  });

  socket.on('parent:emergency', async (data) => {
    try {
      const auth = getAuth(socket);
      if (auth.userType !== 'PARENT' || !auth.userId) {
        socket.emit('error', { message: 'Only authenticated parents can trigger emergency' });
        return;
      }

      if (!auth.schoolId) {
        socket.emit('error', { message: 'School not identified' });
        return;
      }

      const { studentName, message } = data;

      const sanitizedStudentName = typeof studentName === 'string'
        ? studentName.replace(/[<>]/g, '').substring(0, 100)
        : 'a student';

      socket.to(`school:${auth.schoolId}`).emit('fleet:emergency-alert', {
        parentId: auth.userId,
        studentName: sanitizedStudentName,
        message: typeof message === 'string' ? message.substring(0, 500) : 'Emergency triggered by a parent',
        timestamp: new Date(),
      });

      socket.emit('emergency:acknowledged', { timestamp: new Date() });
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to trigger emergency' });
    }
  });
};
