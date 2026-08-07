import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const constraints = [
  `ALTER TABLE "Bus" ADD CONSTRAINT chk_bus_capacity CHECK ("capacity" > 0)`,
  `ALTER TABLE "Stop" ADD CONSTRAINT chk_stop_lat CHECK ("latitude" >= -90 AND "latitude" <= 90)`,
  `ALTER TABLE "Stop" ADD CONSTRAINT chk_stop_lng CHECK ("longitude" >= -180 AND "longitude" <= 180)`,
  `ALTER TABLE "GpsLocation" ADD CONSTRAINT chk_gps_lat CHECK ("latitude" >= -90 AND "latitude" <= 90)`,
  `ALTER TABLE "GpsLocation" ADD CONSTRAINT chk_gps_lng CHECK ("longitude" >= -180 AND "longitude" <= 180)`,
  `ALTER TABLE "GpsLocation" ADD CONSTRAINT chk_gps_speed CHECK ("speed" IS NULL OR "speed" >= 0)`,
  `ALTER TABLE "Subscription" ADD CONSTRAINT chk_sub_amount CHECK ("amount" >= 0)`,
  `ALTER TABLE "Subscription" ADD CONSTRAINT chk_sub_students CHECK ("studentCount" > 0)`,
];

async function main() {
  console.log('Applying CHECK constraints...');
  for (const sql of constraints) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`✓ Applied: ${sql.match(/ADD CONSTRAINT (\w+)/)?.[1] || 'constraint'}`);
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(`○ Already exists: ${sql.match(/ADD CONSTRAINT (\w+)/)?.[1]}`);
      } else {
        console.error(`✗ Failed: ${sql.match(/ADD CONSTRAINT (\w+)/)?.[1]} - ${error.message}`);
      }
    }
  }
  console.log('Done.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
