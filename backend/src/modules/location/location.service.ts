import prisma from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { sanitizePagination } from '../../utils/pagination';
import { emitToRoom } from '../../socket';
import { calculateDistance, calculateETA, findNearestStop } from '../../utils/distance';
import { sendNotification } from '../notification/notification.service';
import { TripStatus } from '@prisma/client';

interface LocationUpdate {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

const MIN_DEDUPE_DISTANCE_M = 10;
const MAX_DEDUPE_INTERVAL_S = 30;
const TRIP_CACHE_TTL_MS = 60 * 1000;
const lastSaved = new Map<string, { lat: number; lng: number; at: number }>();
const tripCache = new Map<string, { data: any; expiresAt: number }>();

const isValidLatitude = (lat: number): boolean => lat >= -90 && lat <= 90;
const isValidLongitude = (lng: number): boolean => lng >= -180 && lng <= 180;

export const updateLocation = async (tripId: string, location: LocationUpdate) => {
  if (!isValidLatitude(location.latitude) || !isValidLongitude(location.longitude)) {
    throw new BadRequestError('Invalid GPS coordinates');
  }

  if (location.speed !== undefined && (location.speed < 0 || location.speed > 200)) {
    throw new BadRequestError('Invalid speed value');
  }

  const now = Date.now();
  let trip = tripCache.get(tripId)?.data;
  if (!trip || tripCache.get(tripId)!.expiresAt < now) {
    trip = await prisma.trip.findUnique({
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
    if (trip) {
      tripCache.set(tripId, { data: trip, expiresAt: now + TRIP_CACHE_TTL_MS });
    }
    if (tripCache.size > 1000) {
      for (const [key, val] of tripCache) {
        if (val.expiresAt < now) tripCache.delete(key);
      }
    }
  }

  if (!trip) {
    throw new NotFoundError('Trip not found');
  }

  const dedupeNow = Date.now();
  const last = lastSaved.get(tripId);
  if (last) {
    const distanceM = calculateDistance(
      { latitude: last.lat, longitude: last.lng },
      { latitude: location.latitude, longitude: location.longitude }
    ) * 1000;
    const ageS = (dedupeNow - last.at) / 1000;
    if (distanceM < MIN_DEDUPE_DISTANCE_M && ageS < MAX_DEDUPE_INTERVAL_S) {
      if (lastSaved.size > 5000) lastSaved.clear();
      return null;
    }
  }
  lastSaved.set(tripId, {
    lat: location.latitude,
    lng: location.longitude,
    at: dedupeNow,
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
      stops.map((s: any) => ({ id: s.id, latitude: s.latitude, longitude: s.longitude }))
    );

    if (nearestStop) {
      const stopIndex = stops.findIndex((s: any) => s.id === nearestStop.id);
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

  // Non-blocking Socket.IO emit - don't await, fire and forget
  process.nextTick(() => {
    try {
      emitToRoom(`bus:${trip.busId}`, 'bus:location-update', locationData);
      emitToRoom(`school:${trip.bus.schoolId}`, 'fleet:location-update', locationData);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Socket emit failed for location update:', error);
      }
    }
  });

  // Approaching-stop notifications run asynchronously - don't block response
  if (nextStop && etaMinutes !== null && etaMinutes <= 5) {
    process.nextTick(async () => {
      try {
        const studentsOnBus = await prisma.student.findMany({
          where: {
            busId: trip.busId,
            stopId: nextStop.id,
          },
          select: { id: true, name: true, parentId: true },
        });

        const parentIds = [...new Set(studentsOnBus.map((s) => s.parentId))];
        const recentNotifications = await prisma.notification.findMany({
          where: {
            parentId: { in: parentIds },
            data: { contains: `"event":"approaching-stop"` },
            createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
          },
          select: { parentId: true, data: true },
        });

        const alreadyNotified = new Set(
          recentNotifications
            .filter((n) => n.data?.includes(`"stopId":"${nextStop.id}"`))
            .map((n) => n.parentId)
        );

        // Batch Socket.IO emits
        const studentsToNotify = studentsOnBus.filter((s) => !alreadyNotified.has(s.parentId));
        for (const student of studentsToNotify) {
          emitToRoom(`parent:${student.parentId}`, 'bus:approaching-stop', {
            studentId: student.id,
            studentName: student.name,
            stopName: nextStop.name,
            eta: etaMinutes,
            busNumber: trip.bus.busNumber,
          });
        }

        // Batch notification sends
        await Promise.allSettled(
          studentsToNotify.map((student) =>
            sendNotification({
              parentId: student.parentId,
              title: 'Bus approaching stop',
              body: `Bus ${trip.bus.busNumber} is arriving at ${nextStop.name} in ~${Math.round(etaMinutes)} min for ${student.name}.`,
              data: {
                event: 'approaching-stop',
                studentId: student.id,
                stopId: nextStop.id,
                eta: etaMinutes,
                busNumber: trip.bus.busNumber,
              },
            })
          )
        );
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Approaching-stop notification failed:', error);
        }
      }
    });
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

  if (!bus.trips.length || !bus.trips[0].gpsLocations.length) {
    return null;
  }

  return bus.trips[0].gpsLocations[0];
};

export const getTripLocationHistory = async (tripId: string, page: number = 1, limit: number = 100, schoolId?: string) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { bus: { select: { schoolId: true } } },
  });

  if (!trip) {
    throw new NotFoundError('Trip not found');
  }

  if (schoolId && trip.bus.schoolId !== schoolId) {
    throw new NotFoundError('Trip not found');
  }

  const { page: p, limit: l } = sanitizePagination(page, limit);
  const skip = (p - 1) * l;
  const [locations, total] = await Promise.all([
    prisma.gpsLocation.findMany({
      where: { tripId },
      orderBy: { createdAt: 'asc' },
      skip,
      take: l,
    }),
    prisma.gpsLocation.count({ where: { tripId } }),
  ]);

  return { locations, total, page: p, limit: l };
};

export const getFleetLocations = async (schoolId: string) => {
  const buses = await prisma.bus.findMany({
    where: { schoolId, isActive: true },
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
