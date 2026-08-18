CREATE TABLE "staff_system_module_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_module_role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "user_role" NOT NULL,
	"module_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attractions" ADD COLUMN "admin_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "admin_id" uuid;--> statement-breakpoint
ALTER TABLE "staff_system_module_permissions" ADD CONSTRAINT "staff_system_module_permissions_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_system_module_permissions" ADD CONSTRAINT "staff_system_module_permissions_module_id_system_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."system_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_module_role_permissions" ADD CONSTRAINT "system_module_role_permissions_module_id_system_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."system_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_system_module_permissions_staff_idx" ON "staff_system_module_permissions" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "staff_system_module_permissions_module_idx" ON "staff_system_module_permissions" USING btree ("module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_system_module_permissions_staff_module_unique" ON "staff_system_module_permissions" USING btree ("staff_id","module_id");--> statement-breakpoint
CREATE INDEX "system_module_role_permissions_role_idx" ON "system_module_role_permissions" USING btree ("role");--> statement-breakpoint
CREATE INDEX "system_module_role_permissions_module_idx" ON "system_module_role_permissions" USING btree ("module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "system_module_role_permissions_role_module_unique" ON "system_module_role_permissions" USING btree ("role","module_id");--> statement-breakpoint
ALTER TABLE "attractions" ADD CONSTRAINT "attractions_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attractions_admin_idx" ON "attractions" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "users_admin_idx" ON "users" USING btree ("admin_id");