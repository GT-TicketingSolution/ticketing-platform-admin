ALTER TABLE "attraction_management" ADD COLUMN "adult_seats" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attraction_management" ADD COLUMN "child_seats" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attraction_management" ADD COLUMN "student_seats" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attraction_management" ADD COLUMN "senior_seats" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attraction_management" ADD COLUMN "foreigner_seats" integer DEFAULT 0 NOT NULL;
