import * as admin from 'firebase-admin';
import prisma from '../../config/database';

let initialized = false;

const getApp = () => {
  if (initialized) return admin.messaging();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    initialized = true;
    return admin.messaging();
  } catch (error) {
    console.error('FCM init failed:', error);
    return null;
  }
};

export const sendPush = async (fcmToken: string, payload: { title: string; body: string; data?: Record<string, any> }) => {
  const messaging = getApp();
  if (!messaging || !fcmToken) return false;
  try {
    await messaging.send({
      token: fcmToken,
      notification: { title: payload.title, body: payload.body },
      data: payload.data ? Object.fromEntries(Object.entries(payload.data).map(([k, v]) => [k, String(v)])) : undefined,
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });
    return true;
  } catch (error) {
    console.error('FCM send failed:', error);
    return false;
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
    console.error('Failed to load FCM token:', error);
    return null;
  }
};