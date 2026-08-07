import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Skip if already seeded
  const existSchool = await prisma.school.findFirst();
  if (existSchool) {
    console.log('Database already seeded - skipping');
    return;
  }

  const defaultPassword = await bcrypt.hash('admin123', 10);

  // Create a school
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

  // Create a route
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

  // Create a driver (phone matches Flutter demo)
  const driver = await prisma.driver.create({
    data: {
      name: 'Ramesh Kumar',
      phone: '5555555555',
      licenseNumber: 'KA-2023-001',
      password: defaultPassword,
      schoolId: school.id,
    },
  });

  console.log('Driver created:', driver.id);

  // Create a bus
  const bus = await prisma.bus.create({
    data: {
      busNumber: 'BUS-001',
      plateNumber: 'KA-01-AB-1234',
      capacity: 40,
      schoolId: school.id,
      driverId: driver.id,
      routeId: route.id,
    },
  });

  console.log('Bus created:', bus.id);

  // Create a parent (phone matches Flutter demo)
  const parent = await prisma.parent.create({
    data: {
      name: 'Suresh Kumar',
      phone: '9876543210',
      email: 'suresh@example.com',
      password: defaultPassword,
      schoolId: school.id,
    },
  });

  console.log('Parent created:', parent.id);

  // Create admin
  const admin = await prisma.admin.create({
    data: {
      name: 'School Admin',
      phone: '7777777777',
      email: 'admin@greenvalley.edu.in',
      password: defaultPassword,
      schoolId: school.id,
    },
  });

  console.log('Admin created:', admin.id);

  // Create students
  const student1 = await prisma.student.create({
    data: {
      name: 'Rahul Kumar',
      rollNumber: '5A01',
      parentId: parent.id,
      busId: bus.id,
      stopId: route.stops[0].id,
    },
  });

  const student2 = await prisma.student.create({
    data: {
      name: 'Priya Kumar',
      rollNumber: '3B02',
      parentId: parent.id,
      busId: bus.id,
      stopId: route.stops[1].id,
    },
  });

  console.log('Students created:', student1.id, student2.id);

  // Create subscription
  const subscription = await prisma.subscription.create({
    data: {
      schoolId: school.id,
      plan: 'SMALL',
      studentCount: 200,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      amount: 5000,
    },
  });

  console.log('Subscription created:', subscription.id);

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
