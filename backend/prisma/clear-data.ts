import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearTestData() {
  console.log('Clearing all test data...');
  
  await prisma.attendance.deleteMany();
  await prisma.gpsLocation.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.student.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.school.deleteMany();
  
  console.log('All test data cleared successfully');
}

clearTestData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
