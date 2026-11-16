CREATE TABLE IF NOT EXISTS "ticket_print_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"printed_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket_print_logs" DROP COLUMN IF EXISTS "print_count";--> statement-breakpoint
ALTER TABLE "ticket_print_logs" DROP COLUMN IF EXISTS "print_type";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ticket_print_logs" ADD CONSTRAINT "ticket_print_logs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ticket_print_logs" ADD CONSTRAINT "ticket_print_logs_printed_by_users_id_fk" FOREIGN KEY ("printed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_print_logs_booking_idx" ON "ticket_print_logs" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_print_logs_printed_by_idx" ON "ticket_print_logs" USING btree ("printed_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_print_logs_booking_created_idx" ON "ticket_print_logs" USING btree ("booking_id","created_at");