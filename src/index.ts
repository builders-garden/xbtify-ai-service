import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import basicAuth from "express-basic-auth";
import helmet from "helmet";

import { bullBoardAdapter } from "./bullboard/dashboard.js";
import { env } from "./config/env.js";
import agentRoutes from "./routes/agent.route.js";
import userRoutes from "./routes/user.route.js";

// Import Bull workers to start processing jobs
import "./jobs/agentInitialization.job.js";
import "./jobs/agentReinitialization.job.js";
import "./workers/agentInitialization.worker.js";
import "./workers/agentReinitialization.worker.js";

import http from "node:http";
import { validateApiSecret } from "./middleware/auth.middleware.js";

// Load environment variables
dotenv.config();

const app = express();
const port = env.PORT;

const httpServer = http.createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check route (unprotected)
app.get("/health", (_, res) => {
	res.json({ status: "ok" });
});

// Protected API routes
app.use("/api/user", validateApiSecret, userRoutes);
app.use("/api/agent", validateApiSecret, agentRoutes);

// Interact with BullMQ queues
if (env.NODE_ENV === "development" && env.ENABLE_BULLBOARD === true) {
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
		bullBoardAdapter.getRouter(),
	);
}

// Start HTTP server (not app.listen anymore)
httpServer.listen(port, () => {
	console.log(`🚀 Server with WS enabled is running on port ${port}`);
});
