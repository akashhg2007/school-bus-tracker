import * as admin from 'firebase-admin';
import { getFirebaseMessaging } from '../../config/firebase';
import prisma from '../../config/database';

let messaging: admin.messaging.Messaging | null = null;

const getMessaging = (): admin.messaging.Messaging | null => {
  if (messaging) return messaging;
  try {
    messaging = getFirebaseMessaging();
    return messaging;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('FCM messaging not available:', error);
    }
    return null;
  }
};

const MAX_RETRIES = 2;

export const sendPush = async (
  fcmToken: string,
  payload: { title: string; body: string; data?: Record<string, any> }
): Promise<boolean> => {
  const messaging = getMessaging();
  if (!messaging || !fcmToken) return false;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await messaging.send({
        token: fcmToken,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ? Object.fromEntries(Object.entries(payload.data).map(([k, v]) => [k, String(v)])) : undefined,
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });
      return true;
    } catch (error: any) {
      if (error.code === 'messaging/registration-token-not-registered' && attempt === 0) {
        await invalidateStaleToken(fcmToken);
        return false;
      }
      if (attempt === MAX_RETRIES) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('FCM send failed after retries:', error.message);
        }
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  return false;
};

const invalidateStaleToken = async (fcmToken: string): Promise<void> => {
  try {
    await prisma.parent.updateMany({
      where: { fcmToken },
      data: { fcmToken: null },
    });
    await prisma.driver.updateMany({
      where: { fcmToken },
      data: { fcmToken: null },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to invalidate stale FCM token:', error);
    }
  }
};

export const getFcmToken = async (userType: string, userId: string): Promise<string | null> => {
  try {
    if (userType === 'PARENT') {
      const p = await prisma.parent.findUnique({ where: { id: userId }, select: { fcmToken: true } });
      return p?.fcmToken ?? null;
    }
    if (userType === 'DRIVER') {
      const d = await prisma.driver.findUnique({ where: { id: userId }, select: { fcmToken: true } });
      return d?.fcmToken ?? null;
    }
    return null;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to load FCM token:', error);
    }
    return null;
  }
};
