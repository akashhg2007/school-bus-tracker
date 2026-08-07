import prisma from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { hashPassword } from '../../utils/password';
import { sanitizePagination } from '../../utils/pagination';

interface CreateParentInput {
  name: string;
  phone: string;
  email?: string;
  password?: string;
  schoolId: string;
}

interface UpdateParentInput {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
}

export const createParent = async (data: CreateParentInput) => {
  const existing = await prisma.parent.findUnique({ where: { phone: data.phone } });
  if (existing) {
    throw new ConflictError('Parent with this phone already exists');
  }

  const hashedPassword = data.password ? await hashPassword(data.password) : null;

  const parent = await prisma.parent.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      password: hashedPassword,
      schoolId: data.schoolId,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      schoolId: true,
      _count: { select: { students: true } },
    },
  });

  return parent;
};

export const getParentsBySchool = async (schoolId: string, page: number = 1, limit: number = 20) => {
  const { page: p, limit: l } = sanitizePagination(page, limit);
  const skip = (p - 1) * l;

  const [parents, total] = await Promise.all([
    prisma.parent.findMany({
      where: { schoolId, isActive: true },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        schoolId: true,
        _count: { select: { students: true } },
        students: {
          select: { id: true, name: true, rollNumber: true },
        },
      },
      skip,
      take: l,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.parent.count({ where: { schoolId, isActive: true } }),
  ]);

  return { parents, total, page: p, limit: l };
};

export const getParentById = async (parentId: string, schoolId?: string) => {
  const parent = await prisma.parent.findUnique({
    where: { id: parentId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      schoolId: true,
      _count: { select: { students: true } },
      students: {
        select: { id: true, name: true, rollNumber: true },
      },
    },
  });
  if (!parent) {
    throw new NotFoundError('Parent not found');
  }
  if (schoolId && parent.schoolId !== schoolId) {
    throw new NotFoundError('Parent not found');
  }
  return parent;
};

export const updateParent = async (
  parentId: string,
  data: UpdateParentInput,
  schoolId?: string,
) => {
  const parent = await prisma.parent.findUnique({ where: { id: parentId } });
  if (!parent) {
    throw new NotFoundError('Parent not found');
  }

  if (!schoolId || parent.schoolId !== schoolId) {
    throw new NotFoundError('Parent not found');
  }

  if (data.phone && data.phone !== parent.phone) {
    const existing = await prisma.parent.findUnique({ where: { phone: data.phone } });
    if (existing) {
      throw new ConflictError('Parent with this phone already exists');
    }
  }

  const allowedFields: Record<string, any> = {};
  if (data.name !== undefined) allowedFields.name = data.name;
  if (data.phone !== undefined) allowedFields.phone = data.phone;
  if (data.email !== undefined) allowedFields.email = data.email;
  if (data.password) allowedFields.password = await hashPassword(data.password);

  const updated = await prisma.parent.update({
    where: { id: parentId },
    data: allowedFields,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      schoolId: true,
      _count: { select: { students: true } },
    },
  });

  return updated;
};

export const deleteParent = async (parentId: string, schoolId?: string) => {
  const parent = await prisma.parent.findUnique({ where: { id: parentId } });
  if (!parent) {
    throw new NotFoundError('Parent not found');
  }

  if (!schoolId || parent.schoolId !== schoolId) {
    throw new NotFoundError('Parent not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.student.updateMany({
      where: { parentId },
      data: { busId: null, stopId: null },
    });

    await tx.parent.update({
      where: { id: parentId },
      data: { isActive: false },
    });
  });

  return { message: 'Parent deactivated successfully' };
};
