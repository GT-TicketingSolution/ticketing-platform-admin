ALTER TABLE "seat_layouts" ADD COLUMN "admin_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "seat_layouts" ADD CONSTRAINT "seat_layouts_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "seat_layouts_admin_idx" ON "seat_layouts" USING btree ("admin_id");