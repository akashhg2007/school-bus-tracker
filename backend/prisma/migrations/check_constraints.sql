-- CHECK constraints for data integrity
-- Run after `prisma db push` to add database-level constraints

-- Bus capacity must be positive
ALTER TABLE "Bus" ADD CONSTRAINT chk_bus_capacity CHECK ("capacity" > 0);

-- Stop latitude must be valid
ALTER TABLE "Stop" ADD CONSTRAINT chk_stop_lat CHECK ("latitude" >= -90 AND "latitude" <= 90);

-- Stop longitude must be valid
ALTER TABLE "Stop" ADD CONSTRAINT chk_stop_lng CHECK ("longitude" >= -180 AND "longitude" <= 180);

-- GPS location latitude must be valid
ALTER TABLE "GpsLocation" ADD CONSTRAINT chk_gps_lat CHECK ("latitude" >= -90 AND "latitude" <= 90);

-- GPS location longitude must be valid
ALTER TABLE "GpsLocation" ADD CONSTRAINT chk_gps_lng CHECK ("longitude" >= -180 AND "longitude" <= 180);

-- GPS speed must be non-negative if provided
ALTER TABLE "GpsLocation" ADD CONSTRAINT chk_gps_speed CHECK ("speed" IS NULL OR "speed" >= 0);

-- Subscription amount must be non-negative
ALTER TABLE "Subscription" ADD CONSTRAINT chk_sub_amount CHECK ("amount" >= 0);

-- Subscription student count must be positive
ALTER TABLE "Subscription" ADD CONSTRAINT chk_sub_students CHECK ("studentCount" > 0);
