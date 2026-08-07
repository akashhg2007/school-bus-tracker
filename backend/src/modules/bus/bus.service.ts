import prisma from '../../config/database';
import { BadRequestError, NotFoundError, ConflictError } from '../../utils/errors';
import { sanitizePagination } from '../../utils/pagination';
import { TripStatus } from '@prisma/client';

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
  const existingBus = await prisma.bus.findFirst({
    where: {
      busNumber: data.busNumber,
      schoolId: data.schoolId,
    },
  });

  if (existingBus) {
    throw new ConflictError('Bus with this number already exists');
  }

  const existingPlate = await prisma.bus.findFirst({
    where: {
      plateNumber: data.plateNumber,
      schoolId: data.schoolId,
    },
  });

  if (existingPlate) {
    throw new ConflictError('Bus with this plate number already exists');
  }

  if (data.driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: data.driverId },
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    const driverBus = await prisma.bus.findFirst({
      where: { driverId: data.driverId },
    });

    if (driverBus) {
      throw new ConflictError('Driver is already assigned to a bus');
    }
  }

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

export const getBusesBySchool = async (
  schoolId: string,
  page: number = 1,
  limit: number = 10,
  filters: { search?: string; isActive?: boolean; driverAssigned?: boolean } = {},
  sort: { field?: string; direction?: 'asc' | 'desc' } = {}
) => {
  const { page: p, limit: l, skip } = sanitizePagination(page, limit);

  const where: any = { schoolId };
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  else where.isActive = true;

  if (filters.search) {
    where.OR = [
      { busNumber: { contains: filters.search, mode: 'insensitive' } },
      { plateNumber: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.driverAssigned === true) {
    where.driverId = { not: null };
  } else if (filters.driverAssigned === false) {
    where.driverId = null;
  }

  const orderBy: any = {};
  const sortField = sort.field || 'createdAt';
  const sortDir = sort.direction || 'desc';
  orderBy[sortField] = sortDir;

  const [buses, total] = await Promise.all([
    prisma.bus.findMany({
      where,
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
      take: l,
      orderBy,
    }),
    prisma.bus.count({ where }),
  ]);

  return { buses, total, page: p, limit: l };
};

export const getBusById = async (busId: string, schoolId?: string) => {
  const bus = await prisma.bus.findUnique({
    where: { id: busId },
    include: {
      driver: {
        select: { id: true, name: true, phone: true, email: true },
      },
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

  if (schoolId && bus.schoolId !== schoolId) {
    throw new NotFoundError('Bus not found');
  }

  return bus;
};

export const updateBus = async (busId: string, data: UpdateBusInput, schoolId?: string) => {
  const bus = await prisma.bus.findUnique({
    where: { id: busId },
  });

  if (!bus) {
    throw new NotFoundError('Bus not found');
  }

  if (schoolId && bus.schoolId !== schoolId) {
    throw new NotFoundError('Bus not found');
  }

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

  if (data.plateNumber && data.plateNumber !== bus.plateNumber) {
    const existingPlate = await prisma.bus.findFirst({
      where: {
        plateNumber: data.plateNumber,
        schoolId: bus.schoolId,
      },
    });

    if (existingPlate) {
      throw new ConflictError('Bus with this plate number already exists');
    }
  }

  if (data.driverId && data.driverId !== bus.driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: data.driverId },
    });

    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

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

  const allowedFields: Record<string, any> = {};
  if (data.busNumber !== undefined) allowedFields.busNumber = data.busNumber;
  if (data.plateNumber !== undefined) allowedFields.plateNumber = data.plateNumber;
  if (data.capacity !== undefined) allowedFields.capacity = data.capacity;
  if (data.driverId !== undefined) allowedFields.driverId = data.driverId;
  if (data.routeId !== undefined) allowedFields.routeId = data.routeId;
  if (data.gpsDeviceId !== undefined) allowedFields.gpsDeviceId = data.gpsDeviceId;
  if (data.isActive !== undefined) allowedFields.isActive = data.isActive;

  const updatedBus = await prisma.bus.update({
    where: { id: busId },
    data: allowedFields,
    include: {
      driver: true,
      route: true,
      _count: { select: { students: true } },
    },
  });

  return updatedBus;
};

export const deleteBus = async (busId: string, schoolId?: string) => {
  const bus = await prisma.bus.findUnique({
    where: { id: busId },
    include: {
      trips: {
        where: { status: TripStatus.IN_PROGRESS },
        select: { id: true },
      },
    },
  });

  if (!bus) {
    throw new NotFoundError('Bus not found');
  }

  if (schoolId && bus.schoolId !== schoolId) {
    throw new NotFoundError('Bus not found');
  }

  if (bus.trips.length > 0) {
    throw new BadRequestError('Cannot delete bus with active trips');
  }

  await prisma.bus.update({
    where: { id: busId },
    data: { isActive: false },
  });

  return { message: 'Bus deleted successfully' };
};

export const getBusLiveLocation = async (busId: string, schoolId?: string) => {
  const bus = await prisma.bus.findUnique({
    where: { id: busId },
    include: {
      trips: {
        where: { status: TripStatus.IN_PROGRESS },
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

  if (schoolId && bus.schoolId !== schoolId) {
    throw new NotFoundError('Bus not found');
  }

  if (!bus.trips.length || !bus.trips[0].gpsLocations.length) {
    return null;
  }

  return bus.trips[0].gpsLocations[0];
};
