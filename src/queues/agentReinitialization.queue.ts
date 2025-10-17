import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis.js";

export const agentReinitializationQueue = new Queue("agent-reinitialization", {
  connection: redisConnection,
});
