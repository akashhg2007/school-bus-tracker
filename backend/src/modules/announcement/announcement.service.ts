import prisma from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { sanitizePagination } from '../../utils/pagination';

interface CreateAnnouncementInput {
  schoolId: string;
  title: string;
  body: string;
}

export const createAnnouncement = async (data: CreateAnnouncementInput) => {
  if (!data.title.trim() || !data.body.trim()) {
    throw new BadRequestError('Title and body are required');
  }

  return prisma.announcement.create({
    data: {
      schoolId: data.schoolId,
      title: data.title.trim(),
      body: data.body.trim(),
    },
  });
};

export const getSchoolAnnouncements = async (schoolId: string, page: number = 1, limit: number = 20) => {
  const { page: p, limit: l } = sanitizePagination(page, limit);
  const skip = (p - 1) * l;

  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: l,
    }),
    prisma.announcement.count({ where: { schoolId } }),
  ]);

  return { announcements, total, page: p, limit: l };
};

export const deleteAnnouncement = async (announcementId: string, schoolId: string) => {
  const existing = await prisma.announcement.findFirst({
    where: { id: announcementId, schoolId },
  });

  if (!existing) {
    throw new NotFoundError('Announcement not found');
  }

  await prisma.announcement.delete({ where: { id: announcementId } });
  return { message: 'Announcement deleted successfully' };
};