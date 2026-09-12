CREATE TABLE "school_texts" (
	"slug" varchar(16) PRIMARY KEY NOT NULL,
	"title" varchar(40),
	"subtitle" varchar(80),
	"tagline" varchar(200),
	"description" text,
	"groups" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
