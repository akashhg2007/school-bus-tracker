import prisma from '../../config/database';
import { generateToken, AuthPayload } from '../../middleware/auth';
import { NotFoundError, UnauthorizedError, ConflictError, BadRequestError } from '../../utils/errors';
import { hashPassword, comparePassword } from '../../utils/password';
import crypto from 'crypto';

interface SendOtpResult {
  sessionInfo: string;
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

interface LoginResult {
  token: string;
  user: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    userType: 'PARENT' | 'DRIVER' | 'ADMIN';
    schoolId: string;
    schoolName?: string;
  };
}

interface RegisterResult {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  userType: 'PARENT' | 'DRIVER' | 'ADMIN';
  schoolId: string;
  activationToken?: string;
}

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000;
const activationStore = new Map<string, { userId: string; userType: string; expiresAt: number }>();

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

// Cleanup expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpStore) {
    if (now > entry.expiresAt) otpStore.delete(key);
  }
  for (const [key, entry] of activationStore) {
    if (now > entry.expiresAt) activationStore.delete(key);
  }
  for (const [key, entry] of loginAttempts) {
    if (now > entry.lockedUntil) loginAttempts.delete(key);
  }
}, 10 * 60 * 1000);

const constantTimeCompare = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a.padEnd(64, '\0'));
  const bufB = Buffer.from(b.padEnd(64, '\0'));
  return crypto.timingSafeEqual(bufA, bufB);
};

const isLockedOut = (identifier: string): boolean => {
  const entry = loginAttempts.get(identifier);
  if (!entry) return false;
  if (Date.now() > entry.lockedUntil) {
    loginAttempts.delete(identifier);
    return false;
  }
  return true;
};

const recordFailedLogin = (identifier: string): void => {
  const entry = loginAttempts.get(identifier) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
    entry.count = 0;
  }
  loginAttempts.set(identifier, entry);
};

const isValidPhone = (phone: string): boolean => /^\+?[1-9]\d{6,14}$/.test(phone);

// ==================== OTP (kept for backward compat) ====================

export const sendOtp = async (phone: string): Promise<SendOtpResult> => {
  if (!isValidPhone(phone)) {
    throw new BadRequestError('Invalid phone number format');
  }

  const code = String(crypto.randomInt(100000, 999999));
  otpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });

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
    if (!constantTimeCompare(String(otp).trim(), entry.code)) {
      entry.attempts += 1;
      throw new UnauthorizedError('Invalid OTP');
    }
    otpStore.delete(phone);
  } else {
    throw new UnauthorizedError('OTP is required');
  }

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

// ==================== PASSWORD LOGIN ====================

export const loginWithPassword = async (
  identifier: string,
  password: string
): Promise<LoginResult> => {
  if (isLockedOut(identifier)) {
    throw new UnauthorizedError('Account temporarily locked due to too many failed attempts. Please try again later.');
  }

  const whereClause = {
    OR: [
      { phone: identifier },
      { email: identifier },
    ],
    isActive: 1,
  };

  const [parent, driver, admin] = await Promise.all([
    prisma.parent.findFirst({ where: whereClause, include: { school: true } }),
    prisma.driver.findFirst({ where: whereClause, include: { school: true } }),
    prisma.admin.findFirst({ where: whereClause, include: { school: true } }),
  ]);

  const user = parent || driver || admin;
  if (!user) {
    throw new NotFoundError('No account found with this email or phone number');
  }

  if (!user.password) {
    throw new UnauthorizedError('Account not activated. Please use the activation link sent to your email.');
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    recordFailedLogin(identifier);
    throw new UnauthorizedError('Invalid credentials');
  }

  loginAttempts.delete(identifier);

  let userType: 'PARENT' | 'DRIVER' | 'ADMIN';
  if (parent) userType = 'PARENT';
  else if (driver) userType = 'DRIVER';
  else userType = 'ADMIN';

  const payload: AuthPayload = {
    userId: user.id,
    userType,
    schoolId: user.schoolId,
  };
  const token = generateToken(payload);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      userType,
      schoolId: user.schoolId,
      schoolName: (user as any).school?.name,
    },
  };
};

// ==================== ACTIVATION ====================

export const generateActivationToken = async (
  userId: string,
  userType: 'PARENT' | 'DRIVER' | 'ADMIN'
): Promise<string> => {
  for (const [existingToken, entry] of activationStore) {
    if (entry.userId === userId && entry.userType === userType) {
      activationStore.delete(existingToken);
    }
  }

  const token = crypto.randomBytes(32).toString('hex');
  activationStore.set(token, {
    userId,
    userType,
    expiresAt: Date.now() + ACTIVATION_TTL_MS,
  });

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const activationUrl = `${baseUrl}/activate?token=${token}&type=${userType.toLowerCase()}`;

  return activationUrl;
};

export const activateAccount = async (
  token: string,
  newPassword: string
): Promise<{ message: string; userType: string }> => {
  const entry = activationStore.get(token);

  if (!entry) {
    throw new BadRequestError('Invalid or expired activation link');
  }

  if (Date.now() > entry.expiresAt) {
    activationStore.delete(token);
    throw new BadRequestError('Activation link has expired. Please request a new one.');
  }

  const hashedPassword = await hashPassword(newPassword);

  if (entry.userType === 'PARENT') {
    await prisma.parent.update({
      where: { id: entry.userId },
      data: { password: hashedPassword },
    });
  } else if (entry.userType === 'DRIVER') {
    await prisma.driver.update({
      where: { id: entry.userId },
      data: { password: hashedPassword },
    });
  } else if (entry.userType === 'ADMIN') {
    await prisma.admin.update({
      where: { id: entry.userId },
      data: { password: hashedPassword },
    });
  }

  activationStore.delete(token);

  return { message: 'Account activated successfully', userType: entry.userType };
};

// ==================== REGISTER (Admin creates user with password) ====================

export const registerUser = async (
  userType: 'PARENT' | 'DRIVER' | 'ADMIN',
  data: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    schoolId: string;
    licenseNumber?: string;
  }
): Promise<RegisterResult> => {
  if (!isValidPhone(data.phone)) {
    throw new BadRequestError('Invalid phone number format');
  }

  const hashedPassword = await hashPassword(data.password);

  if (userType === 'PARENT') {
    const existing = await prisma.parent.findUnique({ where: { phone: data.phone } });
    if (existing) throw new ConflictError('Parent with this phone already exists');

    const parent = await prisma.parent.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        password: hashedPassword,
        schoolId: data.schoolId,
      },
    });

    return {
      id: parent.id,
      name: parent.name,
      phone: parent.phone,
      email: parent.email,
      userType: 'PARENT',
      schoolId: parent.schoolId,
    };
  }

  if (userType === 'DRIVER') {
    const existingPhone = await prisma.driver.findUnique({ where: { phone: data.phone } });
    if (existingPhone) throw new ConflictError('Driver with this phone already exists');

    if (!data.licenseNumber) throw new BadRequestError('License number is required for drivers');

    const existingLicense = await prisma.driver.findUnique({ where: { licenseNumber: data.licenseNumber } });
    if (existingLicense) throw new ConflictError('License number already registered');

    const driver = await prisma.driver.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        password: hashedPassword,
        licenseNumber: data.licenseNumber,
        schoolId: data.schoolId,
      },
    });

    return {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      userType: 'DRIVER',
      schoolId: driver.schoolId,
    };
  }

  if (userType === 'ADMIN') {
    const existing = await prisma.admin.findUnique({ where: { phone: data.phone } });
    if (existing) throw new ConflictError('Admin with this phone already exists');

    const admin = await prisma.admin.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        password: hashedPassword,
        schoolId: data.schoolId,
      },
    });

    return {
      id: admin.id,
      name: admin.name,
      phone: admin.phone,
      email: admin.email,
      userType: 'ADMIN',
      schoolId: admin.schoolId,
    };
  }

  throw new BadRequestError('Invalid user type');
};

// ==================== FCM & PROFILE ====================

export const setupPassword = async (
  phone: string,
  newPassword: string,
  adminSchoolId: string
): Promise<{ message: string; userType: string }> => {
  const hashedPassword = await hashPassword(newPassword);

  const parent = await prisma.parent.findUnique({ where: { phone } });
  if (parent && parent.schoolId === adminSchoolId) {
    await prisma.parent.update({ where: { id: parent.id }, data: { password: hashedPassword } });
    return { message: 'Password set for parent', userType: 'PARENT' };
  }

  const driver = await prisma.driver.findUnique({ where: { phone } });
  if (driver && driver.schoolId === adminSchoolId) {
    await prisma.driver.update({ where: { id: driver.id }, data: { password: hashedPassword } });
    return { message: 'Password set for driver', userType: 'DRIVER' };
  }

  const admin = await prisma.admin.findUnique({ where: { phone } });
  if (admin && admin.schoolId === adminSchoolId) {
    await prisma.admin.update({ where: { id: admin.id }, data: { password: hashedPassword } });
    return { message: 'Password set for admin', userType: 'ADMIN' };
  }

  throw new NotFoundError('No user found with this phone number in your school');
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
