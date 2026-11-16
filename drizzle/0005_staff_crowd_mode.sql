CREATE TABLE IF NOT EXISTS "staff_crowd_mode" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"is_allowed" boolean DEFAULT false NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_crowd_mode" ADD CONSTRAINT "staff_crowd_mode_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_crowd_mode_staff_idx" ON "staff_crowd_mode" USING btree ("staff_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "staff_crowd_mode_staff_unique" ON "staff_crowd_mode" USING btree ("staff_id");
