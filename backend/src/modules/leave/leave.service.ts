import prisma from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { sanitizePagination } from '../../utils/pagination';
import { LeaveStatus } from '@prisma/client';

interface CreateLeaveInput {
  studentId: string;
  parentId: string;
  date: string;
  reason?: string;
}

export const createLeaveRequest = async (data: CreateLeaveInput) => {
  const student = await prisma.student.findFirst({
    where: { id: data.studentId, parentId: data.parentId },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  const date = new Date(data.date);
  if (isNaN(date.getTime())) {
    throw new BadRequestError('Invalid date');
  }

  // Prevent duplicate request for same student + date
  const duplicate = await prisma.leaveRequest.findFirst({
    where: {
      studentId: data.studentId,
      parentId: data.parentId,
      date,
    },
  });

  if (duplicate) {
    throw new BadRequestError('Leave already requested for this date');
  }

  return prisma.leaveRequest.create({
    data: {
      studentId: data.studentId,
      parentId: data.parentId,
      date,
      reason: data.reason || '',
    },
    include: {
      student: { select: { id: true, name: true, rollNumber: true } },
    },
  });
};

export const getParentLeaveRequests = async (parentId: string) => {
  return prisma.leaveRequest.findMany({
    where: { parentId },
    include: {
      student: { select: { id: true, name: true, rollNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getSchoolLeaveRequests = async (schoolId: string, page: number = 1, limit: number = 20) => {
  const { page: p, limit: l } = sanitizePagination(page, limit);
  const skip = (p - 1) * l;
  const where = {
    student: { parent: { schoolId } },
  };

  const [leaves, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, rollNumber: true } },
        parent: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: l,
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  return { leaves, total, page: p, limit: l };
};

export const updateLeaveStatus = async (leaveId: string, status: string) => {
  if (status !== LeaveStatus.APPROVED && status !== LeaveStatus.REJECTED) {
    throw new BadRequestError('Status must be APPROVED or REJECTED');
  }

  const existing = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
    include: {
      student: { select: { id: true, name: true } },
      parent: { select: { id: true, name: true } },
    },
  });

  if (!existing) {
    throw new NotFoundError('Leave request not found');
  }

  return prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { status },
    include: {
      student: { select: { id: true, name: true, rollNumber: true } },
    },
  });
};
