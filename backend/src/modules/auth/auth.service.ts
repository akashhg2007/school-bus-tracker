import prisma from '../../config/database';
import { generateToken, AuthPayload } from '../../middleware/auth';
import { NotFoundError, UnauthorizedError } from '../../utils/errors';

interface SendOtpResult {
  sessionInfo: string;
  devOtp?: string;
}

interface VerifyOtpResult {
  token: string;
  user: {
    id: string;
    name: string;
    phone: string;
    userType: 'PARENT' | 'DRIVER' | 'ADMIN';
    schoolId: string;
  };
}

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

export const sendOtp = async (phone: string): Promise<SendOtpResult> => {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });

  // Always log OTP for debugging (server logs are accessible via Render CLI)
  console.log(`[OTP] Phone: ${phone}, Code: ${code}`);

  if (!isProduction()) {
    return { sessionInfo: 'otp-' + Date.now(), devOtp: code };
  }

  return { sessionInfo: 'otp-' + Date.now() };
};

export const verifyOtp = async (phone: string, otp?: string): Promise<VerifyOtpResult> => {
  const entry = otpStore.get(phone);

  if (otp) {
    if (!entry) {
      throw new UnauthorizedError('OTP expired, request a new one');
    }
    if (Date.now() > entry.expiresAt) {
      otpStore.delete(phone);
      throw new UnauthorizedError('OTP expired, request a new one');
    }
    if (entry.attempts >= MAX_ATTEMPTS) {
      otpStore.delete(phone);
      throw new UnauthorizedError('Too many OTP attempts, request a new code');
    }
    if (String(otp).trim() !== entry.code) {
      entry.attempts += 1;
      throw new UnauthorizedError('Invalid OTP');
    }
    otpStore.delete(phone);
  } else if (isProduction()) {
    throw new UnauthorizedError('OTP is required');
  }
  // Dev mode without OTP keeps the legacy flow for testing.

  // Find user by phone (check parent, driver)
  const parent = await prisma.parent.findUnique({
    where: { phone },
    include: { school: true },
  });

  if (parent) {
    const payload: AuthPayload = {
      userId: parent.id,
      userType: 'PARENT',
      schoolId: parent.schoolId,
    };
    const token = generateToken(payload);

    return {
      token,
      user: {
        id: parent.id,
        name: parent.name,
        phone: parent.phone,
        userType: 'PARENT',
        schoolId: parent.schoolId,
      },
    };
  }

  const driver = await prisma.driver.findUnique({
    where: { phone },
    include: { school: true },
  });

  if (driver) {
    const payload: AuthPayload = {
      userId: driver.id,
      userType: 'DRIVER',
      schoolId: driver.schoolId,
    };
    const token = generateToken(payload);

    return {
      token,
      user: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        userType: 'DRIVER',
        schoolId: driver.schoolId,
      },
    };
  }

  const admin = await prisma.admin.findUnique({
    where: { phone },
    include: { school: true },
  });

  if (admin) {
    const payload: AuthPayload = {
      userId: admin.id,
      userType: 'ADMIN',
      schoolId: admin.schoolId,
    };
    const token = generateToken(payload);

    return {
      token,
      user: {
        id: admin.id,
        name: admin.name,
        phone: admin.phone,
        userType: 'ADMIN',
        schoolId: admin.schoolId,
      },
    };
  }

  throw new NotFoundError('User not found with this phone number');
};

export const updateFcmToken = async (userId: string, userType: string, fcmToken: string): Promise<void> => {
  if (userType === 'PARENT') {
    await prisma.parent.update({
      where: { id: userId },
      data: { fcmToken },
    });
  } else if (userType === 'DRIVER') {
    await prisma.driver.update({
      where: { id: userId },
      data: { fcmToken },
    });
  }
};

export const getMe = async (userId: string, userType: string) => {
  if (userType === 'PARENT') {
    const parent = await prisma.parent.findUnique({
      where: { id: userId },
      include: { school: true },
    });
    if (!parent) throw new NotFoundError('Parent not found');
    return { id: parent.id, name: parent.name, phone: parent.phone, email: parent.email, userType: 'PARENT' as const, schoolId: parent.schoolId, schoolName: parent.school?.name };
  }
  if (userType === 'DRIVER') {
    const driver = await prisma.driver.findUnique({
      where: { id: userId },
      include: { school: true, bus: true },
    });
    if (!driver) throw new NotFoundError('Driver not found');
    return { id: driver.id, name: driver.name, phone: driver.phone, email: driver.email, userType: 'DRIVER' as const, schoolId: driver.schoolId, schoolName: driver.school?.name, bus: driver.bus ? { id: driver.bus.id, busNumber: driver.bus.busNumber, plateNumber: driver.bus.plateNumber } : null };
  }
  if (userType === 'ADMIN') {
    const admin = await prisma.admin.findUnique({
      where: { id: userId },
      include: { school: true },
    });
    if (!admin) throw new NotFoundError('Admin not found');
    return { id: admin.id, name: admin.name, phone: admin.phone, email: admin.email, userType: 'ADMIN' as const, schoolId: admin.schoolId, schoolName: admin.school?.name };
  }
  throw new NotFoundError('User not found');
};
