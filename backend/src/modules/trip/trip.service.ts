import prisma from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { emitToRoom } from '../../config/socket';

interface StartTripInput {
  busId: string;
  driverId: string;
  type: 'MORNING' | 'EVENING';
}

export const startTrip = async (data: StartTripInput) => {
  // Check if bus exists
  const bus = await prisma.bus.findUnique({
    where: { id: data.busId },
    include: {
      driver: true,
      route: {
        include: {
          stops: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  if (!bus) {
    throw new NotFoundError('Bus not found');
  }

  // Check if driver exists
  const driver = await prisma.driver.findUnique({
    where: { id: data.driverId },
  });

  if (!driver) {
    throw new NotFoundError('Driver not found');
  }

  // Check if there's already an active trip for this bus
  const activeTrip = await prisma.trip.findFirst({
    where: {
      busId: data.busId,
      status: 'IN_PROGRESS',
    },
  });

  if (activeTrip) {
    throw new BadRequestError('Bus already has an active trip');
  }

  // Create trip
  const trip = await prisma.trip.create({
    data: {
      busId: data.busId,
      driverId: data.driverId,
      type: data.type,
      status: 'IN_PROGRESS',
      startTime: new Date(),
    },
    include: {
      bus: true,
      driver: true,
    },
  });

  // Emit trip started event
  emitToRoom(`school:${bus.schoolId}`, 'trip:started', {
    tripId: trip.id,
    busId: bus.id,
    busNumber: bus.busNumber,
    driverName: driver.name,
    type: data.type,
  });

  return trip;
};

export const endTrip = async (tripId: string) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      bus: true,
      driver: true,
    },
  });

  if (!trip) {
    throw new NotFoundError('Trip not found');
  }

  if (trip.status !== 'IN_PROGRESS') {
    throw new BadRequestError('Trip is not in progress');
  }

  const updatedTrip = await prisma.trip.update({
    where: { id: tripId },
    data: {
      status: 'COMPLETED',
      endTime: new Date(),
    },
    include: {
      bus: true,
      driver: true,
    },
  });

  // Emit trip ended event
  emitToRoom(`school:${trip.bus.schoolId}`, 'trip:ended', {
    tripId: trip.id,
    busId: trip.bus.id,
    busNumber: trip.bus.busNumber,
    driverName: trip.driver.name,
    type: trip.type,
  });

  return updatedTrip;
};

export const getActiveTrips = async (schoolId: string) => {
  const trips = await prisma.trip.findMany({
    where: {
      bus: { schoolId },
      status: 'IN_PROGRESS',
    },
    include: {
      bus: {
        select: {
          id: true,
          busNumber: true,
          plateNumber: true,
        },
      },
      driver: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      gpsLocations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: {
        select: {
          attendance: {
            where: { status: 'PRESENT' },
          },
        },
      },
    },
    orderBy: { startTime: 'desc' },
  });

  return trips;
};

export const getTripHistory = async (schoolId: string, page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  const [trips, total] = await Promise.all([
    prisma.trip.findMany({
      where: {
        bus: { schoolId },
      },
      include: {
        bus: {
          select: {
            id: true,
            busNumber: true,
            plateNumber: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        _count: {
          select: {
            attendance: {
              where: { status: 'PRESENT' },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.trip.count({
      where: {
        bus: { schoolId },
      },
    }),
  ]);

  return { trips, total, page, limit };
};

export const getTripById = async (tripId: string) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      bus: true,
      driver: true,
      gpsLocations: {
        orderBy: { createdAt: 'desc' },
      },
      attendance: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              rollNumber: true,
            },
          },
        },
      },
    },
  });

  if (!trip) {
    throw new NotFoundError('Trip not found');
  }

  return trip;
};

export const getDriverTrips = async (driverId: string, page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  const [trips, total] = await Promise.all([
    prisma.trip.findMany({
      where: { driverId },
      include: {
        bus: {
          select: {
            id: true,
            busNumber: true,
            plateNumber: true,
          },
        },
        _count: {
          select: {
            attendance: {
              where: { status: 'PRESENT' },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.trip.count({
      where: { driverId },
    }),
  ]);

  return { trips, total, page, limit };
};
