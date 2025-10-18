import dotenv from "dotenv";
import type { Config } from "drizzle-kit";
import { env } from "./src/config/env";

dotenv.config({
	path: ".env",
});

export default {
	schema: "./src/lib/database/db.schema.ts",
	out: "./migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
} satisfies Config;
