CREATE TABLE "users" (
	"phone" text PRIMARY KEY NOT NULL,
	"beta_key" text NOT NULL,
	"activated_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"services" text[] DEFAULT '{}' NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL
);
