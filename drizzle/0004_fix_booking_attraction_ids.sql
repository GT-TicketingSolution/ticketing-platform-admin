ALTER TABLE "bookings"
ALTER COLUMN "attraction_ids"
SET DATA TYPE uuid[]
USING ARRAY["attraction_ids"];