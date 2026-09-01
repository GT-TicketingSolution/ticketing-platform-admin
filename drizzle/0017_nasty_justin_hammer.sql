CREATE TABLE "attraction_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attraction_id" uuid NOT NULL,
	"seat_layout_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"seat_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attraction_management" ADD COLUMN "duration" integer;--> statement-breakpoint
ALTER TABLE "attraction_management" ADD COLUMN "duration_unit" varchar(20);--> statement-breakpoint
ALTER TABLE "attraction_management" ADD COLUMN "adult_seats" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attraction_management" ADD COLUMN "child_seats" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attraction_management" ADD COLUMN "student_seats" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attraction_management" ADD COLUMN "senior_seats" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attraction_management" ADD COLUMN "foreigner_seats" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attraction_management_seat_layouts" ADD COLUMN "quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "attraction_seats" ADD CONSTRAINT "attraction_seats_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_seats" ADD CONSTRAINT "attraction_seats_seat_layout_id_seat_layouts_id_fk" FOREIGN KEY ("seat_layout_id") REFERENCES "public"."seat_layouts"("id") ON DELETE cascade ON UPDATE no action;