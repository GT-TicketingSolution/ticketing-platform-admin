CREATE TABLE "seat_booking_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attraction_id" uuid NOT NULL,
	"trip_no" integer NOT NULL,
	"seat_no" varchar(100) NOT NULL,
	"attraction_seat_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seat_booking_history" ADD CONSTRAINT "seat_booking_history_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_booking_history" ADD CONSTRAINT "seat_booking_history_attraction_seat_id_attraction_seats_id_fk" FOREIGN KEY ("attraction_seat_id") REFERENCES "public"."attraction_seats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "seat_booking_history_attraction_idx" ON "seat_booking_history" USING btree ("attraction_id");--> statement-breakpoint
CREATE INDEX "seat_booking_history_trip_idx" ON "seat_booking_history" USING btree ("trip_no");--> statement-breakpoint
CREATE INDEX "seat_booking_history_attraction_seat_idx" ON "seat_booking_history" USING btree ("attraction_seat_id");--> statement-breakpoint
CREATE INDEX "seat_booking_history_attraction_trip_idx" ON "seat_booking_history" USING btree ("attraction_id","trip_no");