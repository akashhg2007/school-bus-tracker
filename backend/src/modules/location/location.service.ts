import prisma from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import { emitToRoom } from '../../config/socket';
import { calculateDistance, calculateETA, findNearestStop } from '../../utils/distance';

interface LocationUpdate {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

export const updateLocation = async (tripId: string, location: LocationUpdate) => {
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

  // Save GPS location
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

  // Get next stop for ETA calculation
  let nextStop = null;
  let etaMinutes = null;
  let distanceKm = null;

  if (trip.bus.route) {
    const stops = trip.bus.route.stops;
    const currentLocation = { latitude: location.latitude, longitude: location.longitude };

    // Find nearest stop
    const nearestStop = findNearestStop(
      currentLocation,
      stops.map((s) => ({ id: s.id, latitude: s.latitude, longitude: s.longitude }))
    );

    if (nearestStop) {
      const stopIndex = stops.findIndex((s) => s.id === nearestStop.id);
      // Get the next stop (not the nearest one if we're between stops)
      const nextStopIndex = stopIndex + 1 < stops.length ? stopIndex + 1 : stopIndex;
      nextStop = stops[nextStopIndex];

      distanceKm = calculateDistance(currentLocation, {
        latitude: nextStop.latitude,
        longitude: nextStop.longitude,
      });

      etaMinutes = calculateETA(distanceKm, location.speed ? location.speed * 3.6 : 20);
    }
  }

  // Emit location update to parents
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

  emitToRoom(`bus:${trip.busId}`, 'bus:location-update', locationData);
  emitToRoom(`school:${trip.bus.schoolId}`, 'fleet:location-update', locationData);

  // Check if approaching parent's stop (for each parent with student on this bus)
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
    }
  }

  return gpsLocation;
};

export const getBusLocation = async (busId: string) => {
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

export const getTripLocationHistory = async (tripId: string) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) {
    throw new NotFoundError('Trip not found');
  }

  const locations = await prisma.gpsLocation.findMany({
    where: { tripId },
    orderBy: { createdAt: 'asc' },
  });

  return locations;
};

export const getFleetLocations = async (schoolId: string) => {
  const buses = await prisma.bus.findMany({
    where: { schoolId },
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
