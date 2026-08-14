CREATE TYPE "public"."attraction_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."module_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TABLE "attraction_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attraction_id" uuid NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"is_active" "module_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"type" varchar(100) NOT NULL,
	"status" "attraction_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manager_attraction_module_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manager_id" uuid NOT NULL,
	"attraction_module_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manager_attraction_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manager_id" uuid NOT NULL,
	"attraction_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manager_system_module_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manager_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"is_active" "module_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_modules_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "attraction_modules" ADD CONSTRAINT "attraction_modules_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_attraction_module_permissions" ADD CONSTRAINT "manager_attraction_module_permissions_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_attraction_module_permissions" ADD CONSTRAINT "manager_attraction_module_permissions_attraction_module_id_attraction_modules_id_fk" FOREIGN KEY ("attraction_module_id") REFERENCES "public"."attraction_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_attraction_permissions" ADD CONSTRAINT "manager_attraction_permissions_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_attraction_permissions" ADD CONSTRAINT "manager_attraction_permissions_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "public"."attractions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_system_module_permissions" ADD CONSTRAINT "manager_system_module_permissions_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_system_module_permissions" ADD CONSTRAINT "manager_system_module_permissions_module_id_system_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."system_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attraction_modules_attraction_idx" ON "attraction_modules" USING btree ("attraction_id");--> statement-breakpoint
CREATE INDEX "attraction_modules_key_idx" ON "attraction_modules" USING btree ("key");--> statement-breakpoint
CREATE INDEX "attractions_name_idx" ON "attractions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "attractions_status_idx" ON "attractions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "manager_attraction_module_permissions_manager_idx" ON "manager_attraction_module_permissions" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "manager_attraction_module_permissions_module_idx" ON "manager_attraction_module_permissions" USING btree ("attraction_module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "manager_attraction_module_unique" ON "manager_attraction_module_permissions" USING btree ("manager_id","attraction_module_id");--> statement-breakpoint
CREATE INDEX "manager_attraction_permissions_manager_idx" ON "manager_attraction_permissions" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "manager_attraction_permissions_attraction_idx" ON "manager_attraction_permissions" USING btree ("attraction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "manager_attraction_unique" ON "manager_attraction_permissions" USING btree ("manager_id","attraction_id");--> statement-breakpoint
CREATE INDEX "manager_system_permissions_manager_idx" ON "manager_system_module_permissions" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "manager_system_permissions_module_idx" ON "manager_system_module_permissions" USING btree ("module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "manager_system_module_unique" ON "manager_system_module_permissions" USING btree ("manager_id","module_id");--> statement-breakpoint
CREATE INDEX "system_modules_key_idx" ON "system_modules" USING btree ("key");