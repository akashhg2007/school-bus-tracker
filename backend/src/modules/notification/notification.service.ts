import prisma from '../../config/database';
import { emitToRoom } from '../../socket';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { sanitizePagination } from '../../utils/pagination';
import { sendPush, getFcmToken } from './fcm.service';

interface SendNotificationInput {
  userId: string;
  userType: 'PARENT' | 'DRIVER' | 'ADMIN';
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const sendNotification = async (data: SendNotificationInput, schoolId?: string) => {
  if (schoolId) {
    let target;
    if (data.userType === 'PARENT') {
      target = await prisma.parent.findUnique({
        where: { id: data.userId },
        select: { schoolId: true },
      });
    } else if (data.userType === 'DRIVER') {
      target = await prisma.driver.findUnique({
        where: { id: data.userId },
        select: { schoolId: true },
      });
    } else {
      target = await prisma.admin.findUnique({
        where: { id: data.userId },
        select: { schoolId: true },
      });
    }

    if (!target || target.schoolId !== schoolId) {
      throw new NotFoundError('Target user not found');
    }
  }

  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      userType: data.userType,
      title: data.title,
      body: data.body,
      data: data.data ? JSON.stringify(data.data) : null,
    },
  });

  const roomName = `${data.userType.toLowerCase()}:${data.userId}`;
  try {
    emitToRoom(roomName, 'notification:new', notification);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Socket emit failed for notification:', error);
    }
  }

  if (data.userType === 'PARENT' || data.userType === 'DRIVER') {
    try {
      const token = await getFcmToken(data.userType, data.userId);
      if (token) {
        await sendPush(token, { title: data.title, body: data.body, data: data.data });
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('FCM push failed:', error);
      }
    }
  }

  return notification;
};

const MAX_BULK_RECIPIENTS = 1000;

export const sendBulkNotification = async (
  userIds: Array<{ userId: string; userType: 'PARENT' | 'DRIVER' | 'ADMIN' }>,
  title: string,
  body: string,
  data?: Record<string, any>
) => {
  if (userIds.length > MAX_BULK_RECIPIENTS) {
    throw new BadRequestError(`Cannot send to more than ${MAX_BULK_RECIPIENTS} recipients at once`);
  }
  const jsonData = data ? JSON.stringify(data) : null;
  const notifications = await prisma.notification.createMany({
    data: userIds.map((user) => ({
      userId: user.userId,
      userType: user.userType,
      title,
      body,
      data: jsonData,
    })),
  });

  for (const user of userIds) {
    const roomName = `${user.userType.toLowerCase()}:${user.userId}`;
    try {
      emitToRoom(roomName, 'notification:new', { title, body, data });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Socket emit failed for bulk notification:', error);
      }
    }
  }

  const fcmTargets = userIds.filter((u) => u.userType === 'PARENT' || u.userType === 'DRIVER');
  await Promise.allSettled(
    fcmTargets.map(async (user) => {
      try {
        const token = await getFcmToken(user.userType, user.userId);
        if (token) await sendPush(token, { title, body, data });
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('FCM push failed for bulk:', error);
        }
      }
    })
  );

  return notifications;
};

export const sendSchoolNotification = async (schoolId: string, title: string, body: string, data?: Record<string, any>) => {
  const [parents, drivers] = await Promise.all([
    prisma.parent.findMany({ where: { schoolId }, select: { id: true } }),
    prisma.driver.findMany({ where: { schoolId }, select: { id: true } }),
  ]);

  const userIds = [
    ...parents.map((p) => ({ userId: p.id, userType: 'PARENT' as const })),
    ...drivers.map((d) => ({ userId: d.id, userType: 'DRIVER' as const })),
  ];

  return sendBulkNotification(userIds, title, body, data);
};

export const getUserNotifications = async (userId: string, userType: string, page: number = 1, limit: number = 20) => {
  const { page: p, limit: l } = sanitizePagination(page, limit);
  const skip = (p - 1) * l;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, userType: userType as any },
      skip,
      take: l,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({
      where: { userId, userType: userType as any },
    }),
  ]);

  return { notifications, total, page: p, limit: l };
};

export const markAsRead = async (notificationId: string, userId?: string, userType?: string) => {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new NotFoundError('Notification not found');

  if (!userId || !userType) {
    throw new NotFoundError('User identification required');
  }

  if (notification.userId !== userId || notification.userType !== userType) {
    throw new NotFoundError('Notification not found');
  }

  await prisma.notification.update({ where: { id: notificationId }, data: { isRead: 1 } });
  return { message: 'Notification marked as read' };
};

export const markAllAsRead = async (userId: string, userType: string) => {
  await prisma.notification.updateMany({
    where: { userId, userType: userType as any, isRead: 0 },
    data: { isRead: 1 },
  });
  return { message: 'All notifications marked as read' };
};

export const sendIncidentReport = async (schoolId: string, tripId: string, type: 'DELAY' | 'BREAKDOWN', details?: string) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { bus: { select: { busNumber: true, schoolId: true } } },
  });

  if (!trip) {
    throw new NotFoundError('Trip not found');
  }

  if (trip.bus.schoolId !== schoolId) {
    throw new NotFoundError('Trip not found');
  }

  const admins = await prisma.admin.findMany({ where: { schoolId }, select: { id: true } });
  const busNumber = trip.bus.busNumber;
  const title = type === 'BREAKDOWN' ? 'Bus breakdown reported' : 'Bus delay reported';
  const body = `Bus ${busNumber} ${type === 'BREAKDOWN' ? 'has a breakdown' : 'is running late'}. ${details || ''}`.trim();

  return sendBulkNotification(
    admins.map((a) => ({ userId: a.id, userType: 'ADMIN' as const })),
    title,
    body,
    { tripId, type, busNumber }
  );
};
