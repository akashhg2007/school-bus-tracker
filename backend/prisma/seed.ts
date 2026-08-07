import { PrismaClient, SubscriptionPlan } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const existSchool = await prisma.school.findFirst();
  if (existSchool) {
    console.log('Database already has data - skipping seed');
    return;
  }

  // Only create minimal infrastructure - no users with passwords
  const school = await prisma.school.create({
    data: {
      name: 'Green Valley School',
      address: '123 Education Lane',
      city: 'Bangalore',
      state: 'Karnataka',
      phone: '+919876543210',
      email: 'admin@greenvalley.edu.in',
    },
  });

  console.log('School created:', school.id);

  const route = await prisma.route.create({
    data: {
      name: 'Route A - Main Road',
      schoolId: school.id,
      stops: {
        create: [
          { name: 'Main Road Junction', latitude: 12.9716, longitude: 77.5946, order: 1 },
          { name: 'Park Street', latitude: 12.9750, longitude: 77.5980, order: 2 },
          { name: 'Lake View', latitude: 12.9780, longitude: 77.6010, order: 3 },
          { name: 'School Gate', latitude: 12.9800, longitude: 77.6050, order: 4 },
        ],
      },
    },
    include: { stops: true },
  });

  console.log('Route created:', route.id);

  const bus = await prisma.bus.create({
    data: {
      busNumber: 'BUS-001',
      plateNumber: 'KA-01-AB-1234',
      capacity: 40,
      schoolId: school.id,
      routeId: route.id,
    },
  });

  console.log('Bus created:', bus.id);

  const subscription = await prisma.subscription.create({
    data: {
      schoolId: school.id,
      plan: SubscriptionPlan.SMALL,
      studentCount: 200,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      amount: 5000,
    },
  });

  console.log('Subscription created:', subscription.id);
  console.log('School ID (use for first admin):', school.id);
  console.log('Database seeded successfully! Create first admin via /api/auth/setup');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
