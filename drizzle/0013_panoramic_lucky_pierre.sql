CREATE TABLE "attraction_management_seat_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attraction_management_id" uuid NOT NULL,
	"seat_layout_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attraction_management_seat_layout_unique" UNIQUE("attraction_management_id","seat_layout_id")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "attraction_management_seat_layouts" ADD CONSTRAINT "attraction_management_seat_layouts_attraction_management_id_attraction_management_id_fk" FOREIGN KEY ("attraction_management_id") REFERENCES "public"."attraction_management"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_management_seat_layouts" ADD CONSTRAINT "attraction_management_seat_layouts_seat_layout_id_seat_layouts_id_fk" FOREIGN KEY ("seat_layout_id") REFERENCES "public"."seat_layouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attraction_management_seat_layout_attraction_idx" ON "attraction_management_seat_layouts" USING btree ("attraction_management_id");--> statement-breakpoint
CREATE INDEX "attraction_management_seat_layout_layout_idx" ON "attraction_management_seat_layouts" USING btree ("seat_layout_id");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;