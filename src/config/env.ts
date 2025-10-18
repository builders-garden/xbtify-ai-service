import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
	// Server
	PORT: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.default("3000"),
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),

	// Backend URL
	BACKEND_URL: z.string().url(),

	// API Security
	API_SECRET_KEY: z
		.string()
		.min(1)
		.default("your-default-32-char-secret-key-here"),

	// Database
	DATABASE_URL: z.string().url(),

	// Redis
	REDIS_URL: z.string().url(),

	// Neynar
	NEYNAR_API_KEY: z.string().min(1),
	NEYNAR_WEBHOOK_ID: z.string().min(1),
	NEYNAR_WEBHOOK_SECRET: z.string().min(1),

	// Application
	APP_URL: z.string().url(),

	// Secret shared with Next.js instance
	SHARED_API_KEY_WITH_NEXT: z.string().min(1),

	// BullBoard
	BULLBOARD_PASSWORD: z.string().min(1),
	ENABLE_BULLBOARD: z
		.string()
		.transform((val) => val === "true")
		.default("false"),

	// Langfuse Agent tracking
	LANGFUSE_SECRET_KEY: z.string().min(1),
	LANGFUSE_PUBLIC_KEY: z.string().min(1),
	LANGFUSE_BASE_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
