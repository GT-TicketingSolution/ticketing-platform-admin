CREATE TABLE "attraction_management" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"attraction_id" uuid NOT NULL,
	"description" text,
	"image" text,
	"timing" varchar(100),
	"adult_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"child_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"student_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"senior_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"foreigner_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"has_seating" boolean DEFAULT false NOT NULL,
	"seat_layout_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attraction_management" ADD CONSTRAINT "attraction_management_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_management" ADD CONSTRAINT "attraction_management_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attraction_management" ADD CONSTRAINT "attraction_management_seat_layout_id_seat_layouts_id_fk" FOREIGN KEY ("seat_layout_id") REFERENCES "public"."seat_layouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attraction_management_admin_idx" ON "attraction_management" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "attraction_management_attraction_idx" ON "attraction_management" USING btree ("attraction_id");--> statement-breakpoint
CREATE INDEX "attraction_management_seat_layout_idx" ON "attraction_management" USING btree ("seat_layout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attraction_management_admin_attraction_unique" ON "attraction_management" USING btree ("admin_id","attraction_id");