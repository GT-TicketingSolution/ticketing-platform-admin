ALTER TABLE "bookings" ADD COLUMN "status" "booking_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "amount_received" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "return_change" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "visited_at" timestamp with time zone NOT NULL;