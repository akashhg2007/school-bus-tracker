import prisma from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';

interface CreateDriverInput {
  name: string;
  phone: string;
  licenseNumber: string;
  email?: string;
  schoolId: string;
}

interface UpdateDriverInput {
  name?: string;
  phone?: string;
  licenseNumber?: string;
  email?: string;
  isActive?: boolean;
}

export const createDriver = async (data: CreateDriverInput) => {
  // Check if phone already exists
  const existingPhone = await prisma.driver.findUnique({
    where: { phone: data.phone },
  });

  if (existingPhone) {
    throw new ConflictError('Phone number already registered');
  }

  // Check if license number already exists
  const existingLicense = await prisma.driver.findUnique({
    where: { licenseNumber: data.licenseNumber },
  });

  if (existingLicense) {
    throw new ConflictError('License number already registered');
  }

  const driver = await prisma.driver.create({
    data: {
      name: data.name,
      phone: data.phone,
      licenseNumber: data.licenseNumber,
      email: data.email,
      schoolId: data.schoolId,
    },
  });

  return driver;
};

export const getDriversBySchool = async (schoolId: string, page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  const [drivers, total] = await Promise.all([
    prisma.driver.findMany({
      where: { schoolId },
      include: {
        bus: {
          select: { id: true, busNumber: true, plateNumber: true },
        },
        _count: { select: { trips: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.driver.count({ where: { schoolId } }),
  ]);

  return { drivers, total, page, limit };
};

export const getDriverById = async (driverId: string) => {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: {
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

  return driver;
};

export const updateDriver = async (driverId: string, data: UpdateDriverInput) => {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    throw new NotFoundError('Driver not found');
  }

  // Check for conflicts if updating phone
  if (data.phone && data.phone !== driver.phone) {
    const existingPhone = await prisma.driver.findUnique({
      where: { phone: data.phone },
    });

    if (existingPhone) {
      throw new ConflictError('Phone number already registered');
    }
  }

  // Check for conflicts if updating license number
  if (data.licenseNumber && data.licenseNumber !== driver.licenseNumber) {
    const existingLicense = await prisma.driver.findUnique({
      where: { licenseNumber: data.licenseNumber },
    });

    if (existingLicense) {
      throw new ConflictError('License number already registered');
    }
  }

    // Build update data
  const updateData: any = { ...data };
  if (updateData.isActive !== undefined) {
    updateData.isActive = updateData.isActive ? 1 : 0;
  }

  const updatedDriver = await prisma.driver.update({
    where: { id: driverId },
    data: updateData,
    include: {
      bus: true,
    },
  });

  return updatedDriver;
};

export const deleteDriver = async (driverId: string) => {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    throw new NotFoundError('Driver not found');
  }

  // Soft delete
  await prisma.driver.update({
    where: { id: driverId },
    data: { isActive: 0 },
  });

  return { message: 'Driver deleted successfully' };
};

export const getDriverProfile = async (driverId: string) => {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: {
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
