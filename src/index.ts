import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import basicAuth from "express-basic-auth";
import helmet from "helmet";

import { getBullboardRouter } from "./bullboard/dashboard.js";
import { env } from "./config/env.js";
import agentRoutes from "./routes/agent.route.js";
import neynarRoutes from "./routes/neynar.route.js";
import userRoutes from "./routes/user.route.js";
import type { RequestWithRawBody } from "./types/index.js";

// Import Bull workers to start processing jobs
import "./jobs/agentInitialization.job.js";
import "./jobs/agentReinitialization.job.js";
import "./jobs/neynar.job.js";
import "./workers/agentInitialization.worker.js";
import "./workers/agentReinitialization.worker.js";
import "./workers/neynar.worker.js";

import http from "node:http";
import { redisConnection } from "./lib/redis.js";
import {
	validateApiSecret,
	validateNeynarSecret,
} from "./middleware/auth.middleware.js";
import { agentInitializationWorker } from "./workers/agentInitialization.worker.js";
import { agentReinitializationWorker } from "./workers/agentReinitialization.worker.js";
import { neynarWebhookWorker } from "./workers/neynar.worker.js";

// Load environment variables
dotenv.config();

const app = express();
const port = env.PORT;

const httpServer = http.createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(
	express.json({
		verify: (req, _res, buf) => {
			// capture raw body for HMAC verification
			(req as RequestWithRawBody).rawBody = buf.toString("utf8");
		},
	}),
);

// Health check route (unprotected)
app.get("/health", (_, res) => {
	res.json({ status: "ok" });
});

// Protected API routes
app.use("/api/user", validateApiSecret, userRoutes);
app.use("/api/agent", validateApiSecret, agentRoutes);
app.use("/api/v1/neynar", validateNeynarSecret, neynarRoutes);

// Interact with BullMQ queues
if (env.NODE_ENV === "development" && env.ENABLE_BULLBOARD) {
	console.log(`🧭 Bull Board: http://localhost:${port}/admin/queues`);
	app.use(
		"/admin/queues",
		basicAuth({
			users: {
				admin: env.BULLBOARD_PASSWORD,
			},
			challenge: true,
			unauthorizedResponse: "Unauthorized",
		}),
		getBullboardRouter("/admin/queues"),
	);
}

// Start HTTP server (not app.listen anymore)
httpServer.listen(port, () => {
	console.log(`🚀 Server with WS enabled is running on port ${port}`);
});

// Unified graceful shutdown
let isShuttingDown = false;
const shutdown = async (signal: string) => {
	if (isShuttingDown) return;
	isShuttingDown = true;
	console.log(`${signal} received, shutting down...`);

	const tasks: Array<Promise<unknown>> = [];

	// Close HTTP server
	tasks.push(
		new Promise<void>((resolve) => {
			if (!httpServer) {
				return resolve();
			}
			httpServer.close(() => resolve());
		}),
	);

	// Close BullMQ workers
	try {
		tasks.push(agentInitializationWorker.close());
		tasks.push(agentReinitializationWorker.close());
		tasks.push(neynarWebhookWorker.close());
	} catch {}

	// Disconnect Redis
	tasks.push(
		(async () => {
			try {
				await redisConnection.quit();
			} catch {
				try {
					redisConnection.disconnect();
				} catch {}
			}
		})(),
	);

	await Promise.allSettled(tasks);
	console.log("Shutdown complete. Exiting.");
	setTimeout(() => process.exit(0), 100).unref();
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
