import { Worker } from "bullmq";
import { processAgentReinitialization } from "../jobs/agentReinitialization.job.js";
import { redisConnection } from "../lib/redis.js";
import { QueueName } from "../types/enums.js";

export const agentReinitializationWorker = new Worker(
	QueueName.AGENT_REINITIALIZATION,
	async (job) => {
		console.log(`Processing re-initialization agent job #${job.id}`);
		try {
			const result = await processAgentReinitialization(job.data); // use job.data to pass parameters
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

agentReinitializationWorker.on("failed", (job, err) => {
	console.error(`❌ Notifications Job ${job?.id} failed:`, err);
});
