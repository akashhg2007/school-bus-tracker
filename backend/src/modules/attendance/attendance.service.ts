import prisma from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { emitToRoom } from '../../config/socket';

interface MarkAttendanceInput {
  studentId: string;
  tripId: string;
  type: 'BOARDING' | 'DROPOFF';
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
  if (trip.status !== 'IN_PROGRESS') throw new BadRequestError('Trip is not in progress');

  const existingAttendance = await prisma.attendance.findFirst({
    where: {
      studentId: data.studentId,
      tripId: data.tripId,
      type: data.type,
    },
  });

  if (existingAttendance) {
    throw new BadRequestError('Attendance already marked for this student');
  }

  const attendance = await prisma.attendance.create({
    data: {
      studentId: data.studentId,
      tripId: data.tripId,
      type: data.type,
      status: 'PRESENT',
      markedBy: data.markedBy,
    },
    include: {
      student: { select: { id: true, name: true, rollNumber: true } },
      trip: { select: { id: true, type: true } },
    },
  });

  const eventName = data.type === 'BOARDING' ? 'attendance:student-boarded' : 'attendance:student-dropped';
  emitToRoom(`school:${trip.bus.schoolId}`, eventName, {
    studentId: student.id,
    studentName: student.name,
    parentId: student.parentId,
    tripId: trip.id,
    tripType: trip.type,
    type: data.type,
  });

  return attendance;
};

export const getTripAttendance = async (tripId: string) => {
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { bus: true } });
  if (!trip) throw new NotFoundError('Trip not found');

  const attendance = await prisma.attendance.findMany({
    where: { tripId },
    include: { student: { select: { id: true, name: true, rollNumber: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const busStudents = await prisma.student.findMany({
    where: { busId: trip.busId },
    include: { stop: { select: { id: true, name: true } } },
  });

  const attendanceMap = new Map(attendance.map((a) => [a.studentId, a]));
  const studentsWithAttendance = busStudents.map((student) => {
    const boarding = attendanceMap.get(student.id);
    return {
      ...student,
      isBoarded: boarding?.type === 'BOARDING' && boarding?.status === 'PRESENT',
      isDropped: boarding?.type === 'DROPOFF' && boarding?.status === 'PRESENT',
    };
  });

  return {
    trip,
    students: studentsWithAttendance,
    summary: {
      total: busStudents.length,
      boarded: attendance.filter((a) => a.type === 'BOARDING' && a.status === 'PRESENT').length,
      dropped: attendance.filter((a) => a.type === 'DROPOFF' && a.status === 'PRESENT').length,
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
    if (record.type === 'BOARDING' && record.status === 'PRESENT') acc[sid].boarding++;
    if (record.type === 'DROPOFF' && record.status === 'PRESENT') acc[sid].dropoff++;
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
