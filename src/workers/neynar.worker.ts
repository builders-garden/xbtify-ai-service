import { Worker } from "bullmq";
import { processNeynarWebhookJob } from "../jobs/neynar.job.js";
import { redisConnection } from "../lib/redis.js";
import { QueueName } from "../types/enums.js";
import type { JobResult, NeynarWebhookJobData } from "../types/queue.type.js";

export const neynarWebhookWorker = new Worker<NeynarWebhookJobData, JobResult>(
	QueueName.NEYNAR_WEBHOOK,
	async (job) => {
		console.log(
			`[neynar-webhook-worker] Processing neynar webhook job #${job.id}`,
		);
		try {
			const result = await processNeynarWebhookJob(job);

			console.log(
				`| neynar-webhook-worker | completed job #${job.id} | status: ${result.status}`,
			);

			return result;
		} catch (error) {
			console.error(`| neynar-webhook-worker | failed job #${job.id} |`, error);
			throw error;
		}
	},
	{
		connection: redisConnection,
		concurrency: 2, // Process up to 2 neynar webhook jobs simultaneously
		limiter: {
			max: 10,
			duration: 30000, // Max 10 jobs per 30 seconds
		},
		stalledInterval: 30000, // Check for stalled jobs every 30 seconds (default is 30 seconds)
		maxStalledCount: 3, // Allow job to stall 3 times before marking as failed (default is 1)
	},
);

neynarWebhookWorker.on("completed", (job) => {
	console.log(`✅ neynar-webhook-worker #${job.id} completed successfully`);
});

neynarWebhookWorker.on("failed", (job, err) => {
	console.error(`❌ neynar-webhook-worker #${job?.id} failed:`, err);
});

neynarWebhookWorker.on("progress", (job, progress) => {
	console.log(`⏳ neynar-webhook-worker #${job.id} progress: ${progress}%`);
});

neynarWebhookWorker.on("error", (err) => {
	console.error("neynar-webhook-worker error:", err);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
	console.log("SIGTERM received, closing neynar-webhook-worker...");
	await neynarWebhookWorker.close();
	console.log("SIGTERM neynar-webhook-worker closed");
});

process.on("SIGINT", async () => {
	console.log("SIGINT received, closing neynar-webhook-worker...");
	await neynarWebhookWorker.close();
	console.log("SIGINT neynar-webhook-worker closed");
});
