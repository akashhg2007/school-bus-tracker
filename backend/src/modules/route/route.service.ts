import prisma from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';

interface CreateRouteInput {
  name: string;
  schoolId: string;
  stops: Array<{
    name: string;
    latitude: number;
    longitude: number;
  }>;
}

interface UpdateRouteInput {
  name?: string;
}

interface CreateStopInput {
  name: string;
  latitude: number;
  longitude: number;
}

interface UpdateStopInput {
  name?: string;
  latitude?: number;
  longitude?: number;
  order?: number;
}

export const createRoute = async (data: CreateRouteInput) => {
  // Check if route name already exists for this school
  const existingRoute = await prisma.route.findFirst({
    where: {
      name: data.name,
      schoolId: data.schoolId,
    },
  });

  if (existingRoute) {
    throw new ConflictError('Route with this name already exists');
  }

  // Create route with stops
  const route = await prisma.route.create({
    data: {
      name: data.name,
      schoolId: data.schoolId,
      stops: {
        create: data.stops.map((stop, index) => ({
          name: stop.name,
          latitude: stop.latitude,
          longitude: stop.longitude,
          order: index + 1,
        })),
      },
    },
    include: {
      stops: {
        orderBy: { order: 'asc' },
      },
    },
  });

  return route;
};

export const getRoutesBySchool = async (schoolId: string, page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  const [routes, total] = await Promise.all([
    prisma.route.findMany({
      where: { schoolId },
      include: {
        stops: {
          orderBy: { order: 'asc' },
        },
        _count: { select: { buses: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.route.count({ where: { schoolId } }),
  ]);

  return { routes, total, page, limit };
};

export const getRouteById = async (routeId: string) => {
  const route = await prisma.route.findUnique({
    where: { id: routeId },
    include: {
      stops: {
        orderBy: { order: 'asc' },
      },
      buses: {
        include: {
          driver: {
            select: { id: true, name: true, phone: true },
          },
        },
      },
      _count: { select: { buses: true } },
    },
  });

  if (!route) {
    throw new NotFoundError('Route not found');
  }

  return route;
};

export const updateRoute = async (routeId: string, data: UpdateRouteInput) => {
  const route = await prisma.route.findUnique({
    where: { id: routeId },
  });

  if (!route) {
    throw new NotFoundError('Route not found');
  }

  // Check for conflicts if updating name
  if (data.name && data.name !== route.name) {
    const existingRoute = await prisma.route.findFirst({
      where: {
        name: data.name,
        schoolId: route.schoolId,
      },
    });

    if (existingRoute) {
      throw new ConflictError('Route with this name already exists');
    }
  }

  const updatedRoute = await prisma.route.update({
    where: { id: routeId },
    data,
    include: {
      stops: {
        orderBy: { order: 'asc' },
      },
    },
  });

  return updatedRoute;
};

export const deleteRoute = async (routeId: string) => {
  const route = await prisma.route.findUnique({
    where: { id: routeId },
    include: {
      _count: { select: { buses: true } },
    },
  });

  if (!route) {
    throw new NotFoundError('Route not found');
  }

  if (route._count.buses > 0) {
    throw new ConflictError('Cannot delete route with assigned buses');
  }

  await prisma.route.delete({
    where: { id: routeId },
  });

  return { message: 'Route deleted successfully' };
};

export const addStop = async (routeId: string, data: CreateStopInput) => {
  const route = await prisma.route.findUnique({
    where: { id: routeId },
    include: {
      stops: {
        orderBy: { order: 'desc' },
        take: 1,
      },
    },
  });

  if (!route) {
    throw new NotFoundError('Route not found');
  }

  const nextOrder = route.stops.length > 0 ? route.stops[0].order + 1 : 1;

  const stop = await prisma.stop.create({
    data: {
      name: data.name,
      latitude: data.latitude,
      longitude: data.longitude,
      routeId,
      order: nextOrder,
    },
  });

  return stop;
};

export const updateStop = async (stopId: string, data: UpdateStopInput) => {
  const stop = await prisma.stop.findUnique({
    where: { id: stopId },
  });

  if (!stop) {
    throw new NotFoundError('Stop not found');
  }

  // If updating order, adjust other stops
  if (data.order && data.order !== stop.order) {
    const routeStops = await prisma.stop.findMany({
      where: { routeId: stop.routeId },
      orderBy: { order: 'asc' },
    });

    // Reorder stops
    for (let i = 0; i < routeStops.length; i++) {
      if (routeStops[i].id === stopId) {
        continue;
      }

      let newOrder = routeStops[i].order;
      if (data.order < stop.order) {
        // Moving up
        if (routeStops[i].order >= data.order && routeStops[i].order < stop.order) {
          newOrder = routeStops[i].order + 1;
        }
      } else {
        // Moving down
        if (routeStops[i].order > stop.order && routeStops[i].order <= data.order) {
          newOrder = routeStops[i].order - 1;
        }
      }

      if (newOrder !== routeStops[i].order) {
        await prisma.stop.update({
          where: { id: routeStops[i].id },
          data: { order: newOrder },
        });
      }
    }
  }

  const updatedStop = await prisma.stop.update({
    where: { id: stopId },
    data,
  });

  return updatedStop;
};

export const deleteStop = async (stopId: string) => {
  const stop = await prisma.stop.findUnique({
    where: { id: stopId },
    include: {
      _count: { select: { students: true } },
    },
  });

  if (!stop) {
    throw new NotFoundError('Stop not found');
  }

  if (stop._count.students > 0) {
    throw new ConflictError('Cannot delete stop with assigned students');
  }

  // Get all stops in the route to reorder
  const routeStops = await prisma.stop.findMany({
    where: { routeId: stop.routeId },
    orderBy: { order: 'asc' },
  });

  await prisma.stop.delete({
    where: { id: stopId },
  });

  // Reorder remaining stops
  for (let i = 0; i < routeStops.length; i++) {
    if (routeStops[i].id !== stopId) {
      const newOrder = i + 1;
      if (routeStops[i].order !== newOrder) {
        await prisma.stop.update({
          where: { id: routeStops[i].id },
          data: { order: newOrder },
        });
      }
    }
  }

  return { message: 'Stop deleted successfully' };
};
