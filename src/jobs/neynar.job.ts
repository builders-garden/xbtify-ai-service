import type { Job } from "bullmq";
import type { Hex } from "viem";
import { getAgentByFid } from "../lib/database/queries/agent.query.js";
import {
	sendMessageToUserViaNeynar,
	sendMessageToUserViaNeynarRaw,
} from "../lib/neynar.js";
import { handleAskAgent } from "../services/agent.service.js";
import type { JobResult, NeynarWebhookJobData } from "../types/queue.type.js";

/**
 * Process neynar webhook - handle neynar webhook for any farcaster user
 * @param job - The BullMQ job containing the processing request
 */
export async function processNeynarWebhookJob(
	job: Job<NeynarWebhookJobData>,
): Promise<JobResult> {
	const { cast } = job.data;

	console.log(
		`[neynar-webhook-job] Starting job ${job.id} for cast ${cast.createdAt}`,
	);
	await job.updateProgress(5);

	const mentionedFids = cast.mentionedFids;
	let progress = 5;
	const increment = (100 - progress) / mentionedFids.length;

	// process each mentioned fid
	for (const fid of mentionedFids) {
		const agent = await getAgentByFid(fid);
		if (!agent) {
			console.warn(
				`[neynar-webhook-job] Agent not found for mentioned fid ${fid}`,
			);
			continue;
		}
		if (!agent.privateKey) {
			console.warn(
				`[neynar-webhook-job] Agent ${agent.fid} has no private key`,
			);
			continue;
		}
		const question = cast.text;
		const response = await handleAskAgent({
			agent,
			question,
		});
		console.log(
			`[neynar-webhook-job] Response for fid ${fid} ${response.answer}`,
		);

		const message = await sendMessageToUserViaNeynar({
			agentFid: agent.fid,
			agentPrivateKey: agent.privateKey as Hex,
			authorFid: cast.authorFid,
			message: `[1.] ${response.answer}`,
			parentCastUrl: cast.url,
		});
		console.log(
			"[neynar-webhook-job] 1. message posted to farcaster",
			JSON.stringify(message, null, 2),
		);
		const messageRaw = await sendMessageToUserViaNeynarRaw({
			agentFid: agent.fid,
			agentPrivateKey: agent.privateKey as Hex,
			authorFid: cast.authorFid,
			message: `[2.] ${response.answer}`,
			parentCastUrl: cast.url,
		});
		console.log(
			"[neynar-webhook-job] 2. message raw posted to farcaster ",
			JSON.stringify(messageRaw, null, 2),
		);

		progress += increment;
		await job.updateProgress(progress);
	}

	return {
		status: "success",
		message: `Neynar webhook job completed for cast ${cast.createdAt}`,
	};
}
