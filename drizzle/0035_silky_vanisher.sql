ALTER TABLE "courses" ADD COLUMN "schools" varchar(16)[] DEFAULT '{}'::varchar[] NOT NULL;--> statement-breakpoint
-- ГАРААР нэмсэн: одоо байгаа курсуудын ганц `school`-ыг олон сургуулийн жагсаалтад хуулна.
UPDATE "courses" SET "schools" = ARRAY["school"]::varchar[] WHERE "school" <> '' AND cardinality("schools") = 0;