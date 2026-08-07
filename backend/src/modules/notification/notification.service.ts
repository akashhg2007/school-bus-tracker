import prisma from '../../config/database';
import { emitToRoom } from '../../socket';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { sanitizePagination } from '../../utils/pagination';
import { sendPush, getFcmToken } from './fcm.service';

interface SendNotificationInput {
  parentId?: string;
  driverId?: string;
  adminId?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const sendNotification = async (data: SendNotificationInput, schoolId?: string) => {
  let userType: 'PARENT' | 'DRIVER' | 'ADMIN';
  let userId: string;

  if (data.parentId) {
    userType = 'PARENT';
    userId = data.parentId;
  } else if (data.driverId) {
    userType = 'DRIVER';
    userId = data.driverId;
  } else if (data.adminId) {
    userType = 'ADMIN';
    userId = data.adminId;
  } else {
    throw new BadRequestError('Notification must target a parent, driver, or admin');
  }

  if (schoolId) {
    let targetSchoolId: string | null = null;
    if (userType === 'PARENT') {
      const parent = await prisma.parent.findUnique({ where: { id: userId }, select: { schoolId: true } });
      targetSchoolId = parent?.schoolId ?? null;
    } else if (userType === 'DRIVER') {
      const driver = await prisma.driver.findUnique({ where: { id: userId }, select: { schoolId: true } });
      targetSchoolId = driver?.schoolId ?? null;
    } else {
      const admin = await prisma.admin.findUnique({ where: { id: userId }, select: { schoolId: true } });
      targetSchoolId = admin?.schoolId ?? null;
    }
    if (targetSchoolId !== schoolId) {
      throw new NotFoundError('Target user not found');
    }
  }

  const notification = await prisma.notification.create({
    data: {
      parentId: data.parentId || null,
      driverId: data.driverId || null,
      adminId: data.adminId || null,
      title: data.title,
      body: data.body,
      data: data.data ? JSON.stringify(data.data) : null,
    },
  });

  const roomName = `${userType.toLowerCase()}:${userId}`;
  try {
    emitToRoom(roomName, 'notification:new', notification);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Socket emit failed for notification:', error);
    }
  }

  if (userType === 'PARENT' || userType === 'DRIVER') {
    try {
      const token = await getFcmToken(userType, userId);
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
  recipients: Array<{ parentId?: string; driverId?: string; adminId?: string }>,
  title: string,
  body: string,
  data?: Record<string, any>
) => {
  if (recipients.length > MAX_BULK_RECIPIENTS) {
    throw new BadRequestError(`Cannot send to more than ${MAX_BULK_RECIPIENTS} recipients at once`);
  }

  const jsonData = data ? JSON.stringify(data) : null;

  const notifications = await prisma.notification.createMany({
    data: recipients.map((r) => ({
      parentId: r.parentId || null,
      driverId: r.driverId || null,
      adminId: r.adminId || null,
      title,
      body,
      data: jsonData,
    })),
  });

  for (const recipient of recipients) {
    let roomName: string;
    if (recipient.parentId) roomName = `parent:${recipient.parentId}`;
    else if (recipient.driverId) roomName = `driver:${recipient.driverId}`;
    else if (recipient.adminId) roomName = `admin:${recipient.adminId}`;
    else continue;

    try {
      emitToRoom(roomName, 'notification:new', { title, body, data });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Socket emit failed for bulk notification:', error);
      }
    }
  }

  // Batch FCM token fetches (fixes N+1)
  const parentIds = recipients.filter((r) => r.parentId).map((r) => r.parentId!);
  const driverIds = recipients.filter((r) => r.driverId).map((r) => r.driverId!);

  const [parentTokens, driverTokens] = await Promise.all([
    parentIds.length > 0
      ? prisma.parent.findMany({ where: { id: { in: parentIds } }, select: { id: true, fcmToken: true } })
      : Promise.resolve([]),
    driverIds.length > 0
      ? prisma.driver.findMany({ where: { id: { in: driverIds } }, select: { id: true, fcmToken: true } })
      : Promise.resolve([]),
  ]);

  const fcmTargets = [
    ...parentTokens.filter((p) => p.fcmToken).map((p) => p.fcmToken!),
    ...driverTokens.filter((d) => d.fcmToken).map((d) => d.fcmToken!),
  ];

  await Promise.allSettled(fcmTargets.map((token) => sendPush(token, { title, body, data })));

  return notifications;
};

export const sendSchoolNotification = async (schoolId: string, title: string, body: string, data?: Record<string, any>) => {
  const [parents, drivers] = await Promise.all([
    prisma.parent.findMany({ where: { schoolId }, select: { id: true } }),
    prisma.driver.findMany({ where: { schoolId }, select: { id: true } }),
  ]);

  const recipients = [
    ...parents.map((p) => ({ parentId: p.id })),
    ...drivers.map((d) => ({ driverId: d.id })),
  ];

  return sendBulkNotification(recipients, title, body, data);
};

export const getUserNotifications = async (userId: string, userType: string, page: number = 1, limit: number = 20) => {
  const { page: p, limit: l } = sanitizePagination(page, limit);
  const skip = (p - 1) * l;

  const whereClause: any = {};
  if (userType === 'PARENT') whereClause.parentId = userId;
  else if (userType === 'DRIVER') whereClause.driverId = userId;
  else if (userType === 'ADMIN') whereClause.adminId = userId;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: whereClause,
      skip,
      take: l,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where: whereClause }),
  ]);

  return { notifications, total, page: p, limit: l };
};

export const markAsRead = async (notificationId: string, userId?: string, userType?: string) => {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new NotFoundError('Notification not found');

  if (!userId || !userType) {
    throw new NotFoundError('User identification required');
  }

  if (userType === 'PARENT' && notification.parentId !== userId) throw new NotFoundError('Notification not found');
  if (userType === 'DRIVER' && notification.driverId !== userId) throw new NotFoundError('Notification not found');
  if (userType === 'ADMIN' && notification.adminId !== userId) throw new NotFoundError('Notification not found');

  await prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
  return { message: 'Notification marked as read' };
};

export const markAllAsRead = async (userId: string, userType: string) => {
  const whereClause: any = { isRead: false };
  if (userType === 'PARENT') whereClause.parentId = userId;
  else if (userType === 'DRIVER') whereClause.driverId = userId;
  else if (userType === 'ADMIN') whereClause.adminId = userId;

  await prisma.notification.updateMany({
    where: whereClause,
    data: { isRead: true },
  });
  return { message: 'All notifications marked as read' };
};

export const sendIncidentReport = async (schoolId: string, tripId: string, type: 'DELAY' | 'BREAKDOWN', details?: string) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { bus: { select: { busNumber: true, schoolId: true } } },
  });

  if (!trip) throw new NotFoundError('Trip not found');
  if (trip.bus.schoolId !== schoolId) throw new NotFoundError('Trip not found');

  const admins = await prisma.admin.findMany({ where: { schoolId }, select: { id: true } });
  const busNumber = trip.bus.busNumber;
  const title = type === 'BREAKDOWN' ? 'Bus breakdown reported' : 'Bus delay reported';
  const body = `Bus ${busNumber} ${type === 'BREAKDOWN' ? 'has a breakdown' : 'is running late'}. ${details || ''}`.trim();

  return sendBulkNotification(
    admins.map((a) => ({ adminId: a.id })),
    title,
    body,
    { tripId, type, busNumber }
  );
};
