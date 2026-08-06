import prisma from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';

interface CreateMaintenanceInput {
  schoolId: string;
  busId: string;
  title: string;
  description?: string;
  dueDate: string;
}

export const createMaintenance = async (data: CreateMaintenanceInput) => {
  const bus = await prisma.bus.findFirst({
    where: { id: data.busId, schoolId: data.schoolId },
  });

  if (!bus) {
    throw new NotFoundError('Bus not found');
  }

  const dueDate = new Date(data.dueDate);
  if (isNaN(dueDate.getTime())) {
    throw new BadRequestError('Invalid due date');
  }

  return prisma.maintenanceRecord.create({
    data: {
      busId: data.busId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      dueDate,
    },
    include: {
      bus: { select: { id: true, busNumber: true } },
    },
  });
};

export const getSchoolMaintenance = async (schoolId: string, page: number = 1, limit: number = 20) => {
  const skip = (page - 1) * limit;
  const where = { bus: { schoolId } };

  const [records, total] = await Promise.all([
    prisma.maintenanceRecord.findMany({
      where,
      include: {
        bus: { select: { id: true, busNumber: true, plateNumber: true } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.maintenanceRecord.count({ where }),
  ]);

  return { records, total, page, limit };
};

export const updateMaintenanceStatus = async (maintenanceId: string, schoolId: string, status: string) => {
  if (!['PENDING', 'COMPLETED'].includes(status)) {
    throw new BadRequestError('Status must be PENDING or COMPLETED');
  }

  const existing = await prisma.maintenanceRecord.findFirst({
    where: { id: maintenanceId, bus: { schoolId } },
  });

  if (!existing) {
    throw new NotFoundError('Maintenance record not found');
  }

  return prisma.maintenanceRecord.update({
    where: { id: maintenanceId },
    data: {
      status,
      completedAt: status === 'COMPLETED' ? new Date() : null,
    },
    include: {
      bus: { select: { id: true, busNumber: true } },
    },
  });
};

export const deleteMaintenance = async (maintenanceId: string, schoolId: string) => {
  const existing = await prisma.maintenanceRecord.findFirst({
    where: { id: maintenanceId, bus: { schoolId } },
  });

  if (!existing) {
    throw new NotFoundError('Maintenance record not found');
  }

  await prisma.maintenanceRecord.delete({ where: { id: maintenanceId } });
  return { message: 'Maintenance record deleted successfully' };
};