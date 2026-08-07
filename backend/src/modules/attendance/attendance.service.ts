import prisma from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { sanitizePagination } from '../../utils/pagination';
import { emitToRoom } from '../../socket';
import { sendNotification } from '../notification/notification.service';
import { AttendanceType, AttendanceStatus, TripStatus, TripType, Prisma } from '@prisma/client';
import { logger } from '../../utils/logger';

interface MarkAttendanceInput {
  studentId: string;
  tripId: string;
  type: AttendanceType;
  markedBy: string;
}

export const markAttendance = async (data: MarkAttendanceInput) => {
  const student = await prisma.student.findUnique({
    where: { id: data.studentId },
    include: { parent: true, bus: true },
  });

  if (!student) throw new NotFoundError('Student not found');

  const trip = await prisma.trip.findUnique({
    where: { id: data.tripId },
    include: { bus: true },
  });

  if (!trip) throw new NotFoundError('Trip not found');
  if (trip.status !== TripStatus.IN_PROGRESS) throw new BadRequestError('Trip is not in progress');

  if (!student.busId || student.busId !== trip.busId) {
    throw new BadRequestError('Student is not assigned to this bus');
  }

  const attendance = await prisma.$transaction(async (tx) => {
    return tx.attendance.create({
      data: {
        studentId: data.studentId,
        tripId: data.tripId,
        type: data.type,
        status: AttendanceStatus.PRESENT,
        markedBy: data.markedBy,
      },
      include: {
        student: { select: { id: true, name: true, rollNumber: true } },
        trip: { select: { id: true, type: true } },
      },
    });
  }).catch((e) => {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new BadRequestError('Attendance already marked for this student');
    }
    throw e;
  });

  const eventName = data.type === AttendanceType.BOARDING ? 'attendance:student-boarded' : 'attendance:student-dropped';
  emitToRoom(`school:${trip.bus.schoolId}`, eventName, {
    studentId: student.id,
    studentName: student.name,
    parentId: student.parentId,
    tripId: trip.id,
    tripType: trip.type,
    type: data.type,
  });

  try {
    const isEvening = trip.type === TripType.EVENING;
    const title =
      data.type === AttendanceType.BOARDING
        ? isEvening
          ? 'Boarded for return trip'
          : 'Student boarded the bus'
        : isEvening
          ? 'Reached home stop'
          : 'Reached school';
    const body = `${student.name} ${data.type === AttendanceType.BOARDING ? 'boarded' : 'reached'} ${trip.bus.busNumber} ${isEvening ? 'return' : 'morning'} trip.`;
    await sendNotification({
      parentId: student.parentId,
      title,
      body,
      data: {
        event: data.type === AttendanceType.BOARDING ? 'student-boarded' : 'student-reached',
        studentId: student.id,
        busId: trip.bus.id,
        busNumber: trip.bus.busNumber,
        tripType: trip.type,
      },
    });
  } catch (error) {
    logger.error('Failed to notify parent of attendance');
  }

  return attendance;
};

export const getTripAttendance = async (tripId: string, schoolId?: string) => {
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { bus: true } });
  if (!trip) throw new NotFoundError('Trip not found');
  if (schoolId && trip.bus.schoolId !== schoolId) throw new NotFoundError('Trip not found');

  const attendance = await prisma.attendance.findMany({
    where: { tripId },
    include: { student: { select: { id: true, name: true, rollNumber: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const busStudents = await prisma.student.findMany({
    where: { busId: trip.busId },
    include: { stop: { select: { id: true, name: true } } },
  });

  const boardingMap = new Map<string, any>();
  const dropoffMap = new Map<string, any>();
  for (const a of attendance) {
    if (a.type === AttendanceType.BOARDING) boardingMap.set(a.studentId, a);
    if (a.type === AttendanceType.DROPOFF) dropoffMap.set(a.studentId, a);
  }

  const studentsWithAttendance = busStudents.map((student) => {
    const boarding = boardingMap.get(student.id);
    const dropoff = dropoffMap.get(student.id);
    return {
      ...student,
      isBoarded: boarding?.status === AttendanceStatus.PRESENT,
      isDropped: dropoff?.status === AttendanceStatus.PRESENT,
    };
  });

  return {
    trip,
    students: studentsWithAttendance,
    summary: {
      total: busStudents.length,
      boarded: attendance.filter((a) => a.type === AttendanceType.BOARDING && a.status === AttendanceStatus.PRESENT).length,
      dropped: attendance.filter((a) => a.type === AttendanceType.DROPOFF && a.status === AttendanceStatus.PRESENT).length,
    },
  };
};

export const getAttendanceReport = async (schoolId: string, startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const attendance = await prisma.attendance.findMany({
    where: {
      trip: {
        bus: { schoolId },
        createdAt: { gte: start, lte: end },
      },
    },
    include: {
      student: { select: { id: true, name: true, rollNumber: true } },
      trip: { select: { id: true, type: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const studentAttendance = attendance.reduce((acc, record) => {
    const sid = record.studentId;
    if (!acc[sid]) acc[sid] = { student: record.student, boarding: 0, dropoff: 0, total: 0 };
    if (record.type === AttendanceType.BOARDING && record.status === AttendanceStatus.PRESENT) acc[sid].boarding++;
    if (record.type === AttendanceType.DROPOFF && record.status === AttendanceStatus.PRESENT) acc[sid].dropoff++;
    acc[sid].total++;
    return acc;
  }, {} as Record<string, any>);

  return {
    period: { startDate, endDate },
    students: Object.values(studentAttendance),
    summary: { totalRecords: attendance.length, uniqueStudents: Object.keys(studentAttendance).length },
  };
};

export const getParentAttendance = async (parentId: string, studentId: string) => {
  const student = await prisma.student.findFirst({ where: { id: studentId, parentId } });
  if (!student) throw new NotFoundError('Student not found');

  return prisma.attendance.findMany({
    where: { studentId },
    include: { trip: { select: { id: true, type: true, startTime: true, endTime: true } } },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
};

export const getAttendanceHistory = async (schoolId: string, page: number = 1, limit: number = 20) => {
  const { page: p, limit: l } = sanitizePagination(page, limit);
  const skip = (p - 1) * l;
  const where = { trip: { bus: { schoolId } } };

  const [attendance, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, rollNumber: true } },
        trip: {
          select: {
            id: true,
            type: true,
            bus: { select: { id: true, busNumber: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: l,
    }),
    prisma.attendance.count({ where }),
  ]);

  return { attendance, total, page: p, limit: l };
};
