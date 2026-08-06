import prisma from '../../config/database';
import { emitToRoom } from '../../config/socket';

interface SendNotificationInput {
  userId: string;
  userType: 'PARENT' | 'DRIVER' | 'ADMIN';
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const sendNotification = async (data: SendNotificationInput) => {
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
  emitToRoom(roomName, 'notification:new', notification);

  return notification;
};

export const sendBulkNotification = async (
  userIds: Array<{ userId: string; userType: 'PARENT' | 'DRIVER' | 'ADMIN' }>,
  title: string,
  body: string,
  data?: Record<string, any>
) => {
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
    emitToRoom(roomName, 'notification:new', { title, body, data });
  }

  return notifications;
};

export const sendSchoolNotification = async (schoolId: string, title: string, body: string, data?: Record<string, any>) => {
  const parents = await prisma.parent.findMany({ where: { schoolId }, select: { id: true } });
  const drivers = await prisma.driver.findMany({ where: { schoolId }, select: { id: true } });

  const userIds = [
    ...parents.map((p) => ({ userId: p.id, userType: 'PARENT' as const })),
    ...drivers.map((d) => ({ userId: d.id, userType: 'DRIVER' as const })),
  ];

  return sendBulkNotification(userIds, title, body, data);
};

export const getUserNotifications = async (userId: string, userType: string, page: number = 1, limit: number = 20) => {
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, userType: userType as any },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({
      where: { userId, userType: userType as any },
    }),
  ]);

  return { notifications, total, page, limit };
};

export const markAsRead = async (notificationId: string) => {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new Error('Notification not found');

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
