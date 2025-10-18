import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis.js";
import { QueueName } from "../types/enums.js";
import type { AgentInitJobData } from "../types/queue.type.js";

export const agentInitializationQueue = new Queue<AgentInitJobData>(
	QueueName.AGENT_INITIALIZATION,
	{
		connection: redisConnection,
		defaultJobOptions: {
			attempts: 3,
			backoff: {
				type: "exponential",
				delay: 2000,
			},
			removeOnComplete: {
				count: 20, // Keep last 20 completed jobs
				age: 24 * 3600, // Remove completed jobs after 24 hours
			},
			removeOnFail: {
				count: 20, // Keep last 20 failed jobs
				age: 7 * 24 * 3600, // Remove failed jobs after 7 days
			},
		},
	},
);
