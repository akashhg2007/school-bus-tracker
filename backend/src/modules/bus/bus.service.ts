import prisma from '../../config/database';
import { BadRequestError, NotFoundError, ConflictError } from '../../utils/errors';

interface CreateBusInput {
  busNumber: string;
  plateNumber: string;
  capacity: number;
  schoolId: string;
  driverId?: string;
  routeId?: string;
  gpsDeviceId?: string;
}

interface UpdateBusInput {
  busNumber?: string;
  plateNumber?: string;
  capacity?: number;
  driverId?: string;
  routeId?: string;
  gpsDeviceId?: string;
  isActive?: boolean;
}

export const createBus = async (data: CreateBusInput) => {
  // Check if bus number already exists for this school
  const existingBus = await prisma.bus.findFirst({
    where: {
      busNumber: data.busNumber,
      schoolId: data.schoolId,
    },
  });

  if (existingBus) {
    throw new ConflictError('Bus with this number already exists');
  }

  // Validate driver if provided
  if (data.driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: data.driverId },
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    // Check if driver is already assigned to another bus
    const driverBus = await prisma.bus.findFirst({
      where: { driverId: data.driverId },
    });

    if (driverBus) {
      throw new ConflictError('Driver is already assigned to a bus');
    }
  }

  // Validate route if provided
  if (data.routeId) {
    const route = await prisma.route.findUnique({
      where: { id: data.routeId },
    });

    if (!route) {
      throw new NotFoundError('Route not found');
    }
  }

  const bus = await prisma.bus.create({
    data: {
      busNumber: data.busNumber,
      plateNumber: data.plateNumber,
      capacity: data.capacity,
      schoolId: data.schoolId,
      driverId: data.driverId,
      routeId: data.routeId,
      gpsDeviceId: data.gpsDeviceId,
    },
    include: {
      driver: true,
      route: true,
      _count: { select: { students: true } },
    },
  });

  return bus;
};

export const getBusesBySchool = async (schoolId: string, page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  const [buses, total] = await Promise.all([
    prisma.bus.findMany({
      where: { schoolId },
      include: {
        driver: {
          select: { id: true, name: true, phone: true },
        },
        route: {
          select: { id: true, name: true },
        },
        _count: { select: { students: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.bus.count({ where: { schoolId } }),
  ]);

  return { buses, total, page, limit };
};

export const getBusById = async (busId: string) => {
  const bus = await prisma.bus.findUnique({
    where: { id: busId },
    include: {
      driver: true,
      route: {
        include: {
          stops: {
            orderBy: { order: 'asc' },
          },
        },
      },
      students: {
        include: {
          parent: {
            select: { id: true, name: true, phone: true },
          },
        },
      },
      _count: { select: { students: true } },
    },
  });

  if (!bus) {
    throw new NotFoundError('Bus not found');
  }

  return bus;
};

export const updateBus = async (busId: string, data: UpdateBusInput) => {
  const bus = await prisma.bus.findUnique({
    where: { id: busId },
  });

  if (!bus) {
    throw new NotFoundError('Bus not found');
  }

  // Check for conflicts if updating bus number
  if (data.busNumber && data.busNumber !== bus.busNumber) {
    const existingBus = await prisma.bus.findFirst({
      where: {
        busNumber: data.busNumber,
        schoolId: bus.schoolId,
      },
    });

    if (existingBus) {
      throw new ConflictError('Bus with this number already exists');
    }
  }

  // Validate driver if provided
  if (data.driverId && data.driverId !== bus.driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: data.driverId },
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    // Check if driver is already assigned to another bus
    const driverBus = await prisma.bus.findFirst({
      where: {
        driverId: data.driverId,
        id: { not: busId },
      },
    });

    if (driverBus) {
      throw new ConflictError('Driver is already assigned to another bus');
    }
  }

  // Build update data
  const updateData: any = { ...data };
  if (updateData.isActive !== undefined) {
    updateData.isActive = updateData.isActive ? 1 : 0;
  }

  const updatedBus = await prisma.bus.update({
    where: { id: busId },
    data: updateData,
    include: {
      driver: true,
      route: true,
      _count: { select: { students: true } },
    },
  });

  return updatedBus;
};

export const deleteBus = async (busId: string) => {
  const bus = await prisma.bus.findUnique({
    where: { id: busId },
  });

  if (!bus) {
    throw new NotFoundError('Bus not found');
  }

  // Soft delete - set isActive to false
  await prisma.bus.update({
    where: { id: busId },
    data: { isActive: 0 },
  });

  return { message: 'Bus deleted successfully' };
};

export const getBusLiveLocation = async (busId: string) => {
  const bus = await prisma.bus.findUnique({
    where: { id: busId },
    include: {
      trips: {
        where: { status: 'IN_PROGRESS' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          gpsLocations: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (!bus) {
    throw new NotFoundError('Bus not found');
  }

  if (!bus.trips.length || !bus.trips[0].gpsLocations.length) {
    return null;
  }

  return bus.trips[0].gpsLocations[0];
};
