import prisma from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { sanitizePagination } from '../../utils/pagination';
import { emitToRoom } from '../../socket';
import { sendNotification } from '../notification/notification.service';
import { TripType, TripStatus, AttendanceStatus } from '@prisma/client';
import { logger } from '../../utils/logger';

const notifyBusParents = async (busId: string, title: string, body: string, data?: Record<string, any>) => {
  try {
    const students = await prisma.student.findMany({
      where: { busId },
      select: { parentId: true },
    });
    const parentIds = [...new Set(students.map((s) => s.parentId))];
    await Promise.allSettled(
      parentIds.map((parentId) => sendNotification({ parentId, title, body, data }))
    );
  } catch (error) {
    logger.error('Failed to notify bus parents');
  }
};

interface StartTripInput {
  busId: string;
  driverId: string;
  type: TripType;
}

export const startTrip = async (data: StartTripInput) => {
  const trip = await prisma.$transaction(async (tx) => {
    const bus = await tx.bus.findUnique({
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

    if (bus.driverId !== data.driverId) {
      throw new BadRequestError('Driver is not assigned to this bus');
    }

    const activeTrip = await tx.trip.findFirst({
      where: {
        busId: data.busId,
        status: TripStatus.IN_PROGRESS,
      },
    });

    if (activeTrip) {
      throw new BadRequestError('Bus already has an active trip');
    }

    const createdTrip = await tx.trip.create({
      data: {
        busId: data.busId,
        driverId: data.driverId,
        type: data.type,
        status: TripStatus.IN_PROGRESS,
        startTime: new Date(),
      },
      include: {
        bus: true,
        driver: true,
      },
    });

    return { trip: createdTrip, bus };
  });

  const { trip: createdTrip, bus } = trip;

  emitToRoom(`school:${bus.schoolId}`, 'trip:started', {
    tripId: createdTrip.id,
    busId: bus.id,
    busNumber: bus.busNumber,
    driverName: bus.driver?.name,
    type: data.type,
  });

  const startedTitle = data.type === TripType.EVENING ? 'Return trip started' : 'Bus has started';
  const startedBody = `${bus.busNumber} ${data.type === TripType.EVENING ? 'return' : 'morning'} trip has started. Driver: ${bus.driver?.name}`;
  await notifyBusParents(bus.id, startedTitle, startedBody, {
    event: data.type === TripType.EVENING ? 'return-trip-started' : 'trip-started',
    busId: bus.id,
    busNumber: bus.busNumber,
    type: data.type,
  });

  return createdTrip;
};

export const endTrip = async (tripId: string, driverId?: string) => {
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

  if (driverId && trip.driverId !== driverId) {
    throw new NotFoundError('Trip not found');
  }

  if (trip.status !== TripStatus.IN_PROGRESS) {
    throw new BadRequestError('Trip is not in progress');
  }

  const updatedTrip = await prisma.trip.update({
    where: { id: tripId },
    data: {
      status: TripStatus.COMPLETED,
      endTime: new Date(),
    },
    include: {
      bus: true,
      driver: true,
    },
  });

  emitToRoom(`school:${trip.bus.schoolId}`, 'trip:ended', {
    tripId: trip.id,
    busId: trip.bus.id,
    busNumber: trip.bus.busNumber,
    driverName: trip.driver.name,
    type: trip.type,
  });

  await notifyBusParents(trip.bus.id, 'Trip completed', `${trip.bus.busNumber} trip has ended.`, {
    event: 'trip-ended',
    busId: trip.bus.id,
    busNumber: trip.bus.busNumber,
    type: trip.type,
  });

  return updatedTrip;
};

export const getActiveTrips = async (schoolId: string) => {
  const trips = await prisma.trip.findMany({
    where: {
      bus: { schoolId },
      status: TripStatus.IN_PROGRESS,
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
            where: { status: AttendanceStatus.PRESENT },
          },
        },
      },
    },
    orderBy: { startTime: 'desc' },
  });

  return trips;
};

export const getTripHistory = async (schoolId: string, page: number = 1, limit: number = 10) => {
  const { page: p, limit: l } = sanitizePagination(page, limit);
  const skip = (p - 1) * l;

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
              where: { status: AttendanceStatus.PRESENT },
            },
          },
        },
      },
      skip,
      take: l,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.trip.count({
      where: {
        bus: { schoolId },
      },
    }),
  ]);

  return { trips, total, page: p, limit: l };
};

export const getTripById = async (tripId: string, schoolId?: string) => {
  const whereClause: any = { id: tripId };
  if (schoolId) {
    whereClause.bus = { schoolId };
  }
  const trip = await prisma.trip.findFirst({
    where: whereClause,
    include: {
      bus: true,
      driver: true,
      gpsLocations: {
        orderBy: { createdAt: 'desc' },
        take: 500,
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
  const { page: p, limit: l } = sanitizePagination(page, limit);
  const skip = (p - 1) * l;

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
              where: { status: AttendanceStatus.PRESENT },
            },
          },
        },
      },
      skip,
      take: l,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.trip.count({
      where: { driverId },
    }),
  ]);

  return { trips, total, page: p, limit: l };
};
