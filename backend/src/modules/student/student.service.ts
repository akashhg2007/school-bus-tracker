import prisma from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';

interface CreateStudentInput {
  name: string;
  rollNumber: string;
  parentId: string;
  busId?: string;
  stopId?: string;
}

interface UpdateStudentInput {
  name?: string;
  rollNumber?: string;
  busId?: string;
  stopId?: string;
}

export const createStudent = async (data: CreateStudentInput) => {
  // Check if parent exists
  const parent = await prisma.parent.findUnique({
    where: { id: data.parentId },
  });

  if (!parent) {
    throw new NotFoundError('Parent not found');
  }

  // Check if roll number already exists for this parent
  const existingStudent = await prisma.student.findFirst({
    where: {
      rollNumber: data.rollNumber,
      parentId: data.parentId,
    },
  });

  if (existingStudent) {
    throw new ConflictError('Student with this roll number already exists for this parent');
  }

  // Validate bus if provided
  if (data.busId) {
    const bus = await prisma.bus.findUnique({
      where: { id: data.busId },
    });

    if (!bus) {
      throw new NotFoundError('Bus not found');
    }
  }

  // Validate stop if provided
  if (data.stopId) {
    const stop = await prisma.stop.findUnique({
      where: { id: data.stopId },
    });

    if (!stop) {
      throw new NotFoundError('Stop not found');
    }
  }

  const student = await prisma.student.create({
    data: {
      name: data.name,
      rollNumber: data.rollNumber,
      parentId: data.parentId,
      busId: data.busId,
      stopId: data.stopId,
    },
    include: {
      parent: {
        select: { id: true, name: true, phone: true },
      },
      bus: {
        select: { id: true, busNumber: true },
      },
      stop: {
        select: { id: true, name: true },
      },
    },
  });

  return student;
};

export const getStudentsBySchool = async (schoolId: string, page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where: {
        parent: { schoolId },
      },
      include: {
        parent: {
          select: { id: true, name: true, phone: true },
        },
        bus: {
          select: { id: true, busNumber: true },
        },
        stop: {
          select: { id: true, name: true },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.student.count({
      where: {
        parent: { schoolId },
      },
    }),
  ]);

  return { students, total, page, limit };
};

export const getStudentById = async (studentId: string) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      parent: {
        select: { id: true, name: true, phone: true, email: true },
      },
      bus: true,
      stop: true,
      attendance: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      leaveRequests: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  return student;
};

export const updateStudent = async (studentId: string, data: UpdateStudentInput) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  // Check for conflicts if updating roll number
  if (data.rollNumber && data.rollNumber !== student.rollNumber) {
    const existingStudent = await prisma.student.findFirst({
      where: {
        rollNumber: data.rollNumber,
        parentId: student.parentId,
      },
    });

    if (existingStudent) {
      throw new ConflictError('Student with this roll number already exists for this parent');
    }
  }

  // Validate bus if provided
  if (data.busId) {
    const bus = await prisma.bus.findUnique({
      where: { id: data.busId },
    });

    if (!bus) {
      throw new NotFoundError('Bus not found');
    }
  }

  // Validate stop if provided
  if (data.stopId) {
    const stop = await prisma.stop.findUnique({
      where: { id: data.stopId },
    });

    if (!stop) {
      throw new NotFoundError('Stop not found');
    }
  }

  const updatedStudent = await prisma.student.update({
    where: { id: studentId },
    data,
    include: {
      parent: {
        select: { id: true, name: true, phone: true },
      },
      bus: {
        select: { id: true, busNumber: true },
      },
      stop: {
        select: { id: true, name: true },
      },
    },
  });

  return updatedStudent;
};

export const deleteStudent = async (studentId: string) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  await prisma.student.delete({
    where: { id: studentId },
  });

  return { message: 'Student deleted successfully' };
};

export const assignStudentToBus = async (studentId: string, busId: string, stopId: string) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  const bus = await prisma.bus.findUnique({
    where: { id: busId },
  });

  if (!bus) {
    throw new NotFoundError('Bus not found');
  }

  const stop = await prisma.stop.findUnique({
    where: { id: stopId },
  });

  if (!stop) {
    throw new NotFoundError('Stop not found');
  }

  const updatedStudent = await prisma.student.update({
    where: { id: studentId },
    data: {
      busId,
      stopId,
    },
    include: {
      bus: {
        select: { id: true, busNumber: true },
      },
      stop: {
        select: { id: true, name: true },
      },
    },
  });

  return updatedStudent;
};

export const getStudentsByBus = async (busId: string) => {
  const students = await prisma.student.findMany({
    where: { busId },
    include: {
      parent: {
        select: { id: true, name: true, phone: true },
      },
      stop: {
        select: { id: true, name: true, latitude: true, longitude: true },
      },
    },
    orderBy: {
      stop: { order: 'asc' },
    },
  });

  return students;
};

export const getParentStudents = async (parentId: string) => {
  const students = await prisma.student.findMany({
    where: { parentId },
    include: {
      bus: {
        select: { id: true, busNumber: true, plateNumber: true },
      },
      stop: {
        select: { id: true, name: true },
      },
    },
  });

  return students;
};
