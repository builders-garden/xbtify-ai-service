import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
// import { validateApiSecret } from "./middleware/auth.middleware.js";

// import { bullBoardAdapter } from "./bullboard/dashboard.js";
// import basicAuth from "express-basic-auth";

import userRoutes from "./routes/user.route.js";

// Import Bull workers to start processing jobs
// ...

import http from "http";
import { validateApiSecret } from "./middleware/auth.middleware.js";

// import { baseOrigins } from "./lib/cors.js";

// Load environment variables
dotenv.config();

const app = express();
const port = env.PORT;

// Create HTTP server to attach socket.io
const httpServer = http.createServer(app);
// const allowedOrigins =
//   env.NODE_ENV === "development"
//     ? [...baseOrigins, "http://localhost:3000"]
//     : baseOrigins;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check route (unprotected)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Protected API routes
app.use("/api/user", validateApiSecret, userRoutes);

// Interact with BullMQ queues
// if (env.NODE_ENV === "development" && env.ENABLE_BULLBOARD === true) {
//   console.log(`🧭 Bull Board: http://localhost:${port}/admin/queues`);
//   app.use(
//     "/admin/queues",
//     basicAuth({
//       users: {
//         admin: env.BULLBOARD_PASSWORD,
//       },
//       challenge: true,
//       unauthorizedResponse: "Unauthorized",
//     }),
//     bullBoardAdapter.getRouter()
//   );
// }

// app.use("/api/async-jobs", validateApiSecret, asyncJobsRoutes);

// Start HTTP server (not app.listen anymore)
httpServer.listen(port, () => {
  console.log(`🚀 Server with WS enabled is running on port ${port}`);
});

// initializeJobs();
