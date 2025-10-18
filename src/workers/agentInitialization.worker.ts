import { Worker } from "bullmq";
import { processAgentInitialization } from "../jobs/agentInitialization.job.js";
import { redisConnection } from "../lib/redis.js";
import { QueueName } from "../types/enums.js";
import type { AgentInitJobData, JobResult } from "../types/queue.type.js";

export const agentInitializationWorker = new Worker<
	AgentInitJobData,
	JobResult
>(
	QueueName.AGENT_INITIALIZATION,
	async (job) => {
		console.log(`Processing initialization agent job #${job.id}`);
		try {
			const result = await processAgentInitialization(job.data); // use job.data to pass parameters
			return result;
		} catch (error) {
			console.error("Error in agent job:", error);
			throw error;
		}
	},
	{
		connection: redisConnection,
	},
);

agentInitializationWorker.on("failed", (job, err) => {
	console.error(`❌ Notifications Job ${job?.id} failed:`, err);
});
