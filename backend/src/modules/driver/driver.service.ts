import prisma from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { hashPassword } from '../../utils/password';
import { sanitizePagination } from '../../utils/pagination';

interface CreateDriverInput {
  name: string;
  phone: string;
  licenseNumber: string;
  email?: string;
  password?: string;
  schoolId: string;
}

interface UpdateDriverInput {
  name?: string;
  phone?: string;
  licenseNumber?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
}

export const createDriver = async (data: CreateDriverInput) => {
  const existingPhone = await prisma.driver.findUnique({
    where: { phone: data.phone },
  });

  if (existingPhone) {
    throw new ConflictError('Phone number already registered');
  }

  const existingLicense = await prisma.driver.findUnique({
    where: { licenseNumber: data.licenseNumber },
  });

  if (existingLicense) {
    throw new ConflictError('License number already registered');
  }

  const hashedPassword = data.password ? await hashPassword(data.password) : null;

  const driver = await prisma.driver.create({
    data: {
      name: data.name,
      phone: data.phone,
      licenseNumber: data.licenseNumber,
      email: data.email,
      password: hashedPassword,
      schoolId: data.schoolId,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      licenseNumber: true,
      schoolId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return driver;
};

export const getDriversBySchool = async (schoolId: string, page: number = 1, limit: number = 10) => {
  const { page: p, limit: l } = sanitizePagination(page, limit);
  const skip = (p - 1) * l;

  const [drivers, total] = await Promise.all([
    prisma.driver.findMany({
      where: { schoolId, isActive: 1 },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        licenseNumber: true,
        schoolId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        bus: {
          select: { id: true, busNumber: true, plateNumber: true },
        },
        _count: { select: { trips: true } },
      },
      skip,
      take: l,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.driver.count({ where: { schoolId, isActive: 1 } }),
  ]);

  return { drivers, total, page: p, limit: l };
};

export const getDriverById = async (driverId: string, schoolId?: string) => {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      licenseNumber: true,
      schoolId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      bus: true,
      trips: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          bus: {
            select: { busNumber: true, plateNumber: true },
          },
        },
      },
    },
  });

  if (!driver) {
    throw new NotFoundError('Driver not found');
  }

  if (schoolId && driver.schoolId !== schoolId) {
    throw new NotFoundError('Driver not found');
  }

  return driver;
};

export const updateDriver = async (
  driverId: string,
  data: UpdateDriverInput,
  schoolId?: string,
) => {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    throw new NotFoundError('Driver not found');
  }

  if (!schoolId || driver.schoolId !== schoolId) {
    throw new NotFoundError('Driver not found');
  }

  if (data.phone && data.phone !== driver.phone) {
    const existingPhone = await prisma.driver.findUnique({
      where: { phone: data.phone },
    });

    if (existingPhone) {
      throw new ConflictError('Phone number already registered');
    }
  }

  if (data.licenseNumber && data.licenseNumber !== driver.licenseNumber) {
    const existingLicense = await prisma.driver.findUnique({
      where: { licenseNumber: data.licenseNumber },
    });

    if (existingLicense) {
      throw new ConflictError('License number already registered');
    }
  }

  const allowedFields: Record<string, any> = {};
  if (data.name !== undefined) allowedFields.name = data.name;
  if (data.phone !== undefined) allowedFields.phone = data.phone;
  if (data.licenseNumber !== undefined) allowedFields.licenseNumber = data.licenseNumber;
  if (data.email !== undefined) allowedFields.email = data.email;
  if (data.isActive !== undefined) allowedFields.isActive = data.isActive ? 1 : 0;
  if (data.password) allowedFields.password = await hashPassword(data.password);

  const updatedDriver = await prisma.driver.update({
    where: { id: driverId },
    data: allowedFields,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      licenseNumber: true,
      schoolId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      bus: true,
    },
  });

  return updatedDriver;
};

export const deleteDriver = async (driverId: string, schoolId?: string) => {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    throw new NotFoundError('Driver not found');
  }

  if (!schoolId || driver.schoolId !== schoolId) {
    throw new NotFoundError('Driver not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.bus.updateMany({
      where: { driverId },
      data: { driverId: null },
    });

    await tx.driver.update({
      where: { id: driverId },
      data: { isActive: 0 },
    });
  });

  return { message: 'Driver deleted successfully' };
};

export const getDriverProfile = async (driverId: string) => {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      licenseNumber: true,
      schoolId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      school: {
        select: { id: true, name: true, address: true, phone: true },
      },
      bus: {
        select: { id: true, busNumber: true, plateNumber: true, capacity: true },
      },
    },
  });

  if (!driver) {
    throw new NotFoundError('Driver not found');
  }

  return driver;
};
