import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis.js";

export const agentInitializationQueue = new Queue("agent-initialization", {
	connection: redisConnection,
});
