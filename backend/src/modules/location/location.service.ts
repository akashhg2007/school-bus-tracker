import prisma from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { emitToRoom } from '../../socket';
import { calculateDistance, calculateETA, findNearestStop } from '../../utils/distance';
import { sendNotification } from '../notification/notification.service';

interface LocationUpdate {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

const MIN_DEDUPE_DISTANCE_M = 10;
const MAX_DEDUPE_INTERVAL_S = 30;
const lastSaved = new Map<string, { lat: number; lng: number; at: number }>();

const isValidLatitude = (lat: number): boolean => lat >= -90 && lat <= 90;
const isValidLongitude = (lng: number): boolean => lng >= -180 && lng <= 180;

export const updateLocation = async (tripId: string, location: LocationUpdate) => {
  if (!isValidLatitude(location.latitude) || !isValidLongitude(location.longitude)) {
    throw new BadRequestError('Invalid GPS coordinates');
  }

  if (location.speed !== undefined && (location.speed < 0 || location.speed > 200)) {
    throw new BadRequestError('Invalid speed value');
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      bus: {
        include: {
          school: true,
          route: {
            include: {
              stops: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      },
      driver: true,
    },
  });

  if (!trip) {
    throw new NotFoundError('Trip not found');
  }

  const now = Date.now();
  const last = lastSaved.get(tripId);
  if (last) {
    const distanceM = calculateDistance(
      { latitude: last.lat, longitude: last.lng },
      { latitude: location.latitude, longitude: location.longitude }
    ) * 1000;
    const ageS = (now - last.at) / 1000;
    if (distanceM < MIN_DEDUPE_DISTANCE_M && ageS < MAX_DEDUPE_INTERVAL_S) {
      if (lastSaved.size > 5000) lastSaved.clear();
      return null;
    }
  }
  lastSaved.set(tripId, {
    lat: location.latitude,
    lng: location.longitude,
    at: now,
  });

  const gpsLocation = await prisma.gpsLocation.create({
    data: {
      tripId,
      latitude: location.latitude,
      longitude: location.longitude,
      speed: location.speed,
      heading: location.heading,
      accuracy: location.accuracy,
    },
  });

  let nextStop = null;
  let etaMinutes = null;
  let distanceKm = null;

  if (trip.bus.route) {
    const stops = trip.bus.route.stops;
    const currentLocation = { latitude: location.latitude, longitude: location.longitude };

    const nearestStop = findNearestStop(
      currentLocation,
      stops.map((s) => ({ id: s.id, latitude: s.latitude, longitude: s.longitude }))
    );

    if (nearestStop) {
      const stopIndex = stops.findIndex((s) => s.id === nearestStop.id);
      const nextStopIndex = stopIndex + 1 < stops.length ? stopIndex + 1 : stopIndex;
      nextStop = stops[nextStopIndex];

      distanceKm = calculateDistance(currentLocation, {
        latitude: nextStop.latitude,
        longitude: nextStop.longitude,
      });

      etaMinutes = calculateETA(distanceKm, location.speed ? location.speed * 3.6 : 20);
    }
  }

  const locationData = {
    tripId: trip.id,
    busId: trip.bus.id,
    busNumber: trip.bus.busNumber,
    latitude: location.latitude,
    longitude: location.longitude,
    speed: location.speed,
    heading: location.heading,
    driverName: trip.driver.name,
    nextStop: nextStop
      ? {
          id: nextStop.id,
          name: nextStop.name,
          eta: etaMinutes,
          distance: distanceKm,
        }
      : null,
    timestamp: gpsLocation.createdAt,
  };

  try {
    emitToRoom(`bus:${trip.busId}`, 'bus:location-update', locationData);
    emitToRoom(`school:${trip.bus.schoolId}`, 'fleet:location-update', locationData);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Socket emit failed for location update:', error);
    }
  }

  if (nextStop && etaMinutes !== null && etaMinutes <= 5) {
    const studentsOnBus = await prisma.student.findMany({
      where: {
        busId: trip.busId,
        stopId: nextStop.id,
      },
      include: {
        parent: {
          select: { id: true, fcmToken: true },
        },
      },
    });

    for (const student of studentsOnBus) {
      emitToRoom(`parent:${student.parentId}`, 'bus:approaching-stop', {
        studentId: student.id,
        studentName: student.name,
        stopName: nextStop.name,
        eta: etaMinutes,
        busNumber: trip.bus.busNumber,
      });

      try {
        const recent = await prisma.notification.findFirst({
          where: {
            userId: student.parentId,
            userType: 'PARENT',
            data: {
              contains: `"event":"approaching-stop"`,
            },
            createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (recent && recent.data && recent.data.includes(`"stopId":"${nextStop.id}"`)) continue;
        await sendNotification({
          userId: student.parentId,
          userType: 'PARENT',
          title: 'Bus approaching stop',
          body: `Bus ${trip.bus.busNumber} is arriving at ${nextStop.name} in ~${Math.round(etaMinutes)} min for ${student.name}.`,
          data: {
            event: 'approaching-stop',
            studentId: student.id,
            stopId: nextStop.id,
            eta: etaMinutes,
            busNumber: trip.bus.busNumber,
          },
        });
      } catch (error) {
        console.error('Failed to notify parent about approaching stop:', error);
      }
    }
  }

  return gpsLocation;
};

export const getBusLocation = async (busId: string, schoolId?: string) => {
  const whereClause: any = { id: busId };
  if (schoolId) {
    whereClause.schoolId = schoolId;
  }
  const bus = await prisma.bus.findFirst({
    where: whereClause,
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

export const getTripLocationHistory = async (tripId: string, page: number = 1, limit: number = 100) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) {
    throw new NotFoundError('Trip not found');
  }

  const skip = (page - 1) * limit;
  const [locations, total] = await Promise.all([
    prisma.gpsLocation.findMany({
      where: { tripId },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.gpsLocation.count({ where: { tripId } }),
  ]);

  return { locations, total, page, limit };
};

export const getFleetLocations = async (schoolId: string) => {
  const buses = await prisma.bus.findMany({
    where: { schoolId, isActive: 1 },
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
          driver: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  const fleetLocations = buses
    .filter((bus) => bus.trips.length > 0 && bus.trips[0].gpsLocations.length > 0)
    .map((bus) => ({
      busId: bus.id,
      busNumber: bus.busNumber,
      plateNumber: bus.plateNumber,
      driverName: bus.trips[0].driver.name,
      ...bus.trips[0].gpsLocations[0],
      tripId: bus.trips[0].id,
    }));

  return fleetLocations;
};
