import { Worker } from "bullmq";
import { processAgentInitialization } from "../jobs/agentInitialization.job.js";
import { redisConnection } from "../lib/redis.js";

export const agentInitializationWorker = new Worker(
	"agent-initialization",
	async (job) => {
		console.log(`Processing re-initialization agent job #${job.id}`);
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
