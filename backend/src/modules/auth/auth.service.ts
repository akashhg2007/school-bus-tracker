import prisma from '../../config/database';
import { generateToken, AuthPayload } from '../../middleware/auth';
import { NotFoundError } from '../../utils/errors';

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

export const sendOtp = async (phone: string): Promise<SendOtpResult> => {
  // Dev mode: accept any phone number
  return { sessionInfo: 'dev-session-' + Date.now() };
};

export const verifyOtp = async (phone: string): Promise<VerifyOtpResult> => {
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
