import type { Job } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import {
	createAgentCast,
	getAgentByCreatorFidOrFid,
} from "../lib/database/queries/agent.query.js";
import { upsertUserMetadata } from "../lib/database/queries/user-metadata.query.js";
import {
	// sendMessageToUserViaNeynar,
	// sendMessageToUserViaNeynarRaw,
	postCastToFarcaster,
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
		const agent = await getAgentByCreatorFidOrFid(fid);
		// no bot found
		if (!agent) {
			console.warn(
				`[neynar-webhook-job] Agent not found for mentioned fid ${fid}`,
			);
			progress += increment;
			await job.updateProgress(progress);
			continue;
		}
		// the bot should not respond to its own cast
		if (agent.fid === cast.author.fid) {
			console.log(
				`[neynar-webhook-job] Agent ${agent.fid} is the same as the author of the cast, skipping`,
			);
			progress += increment;
			await job.updateProgress(progress);
			continue;
		}
		// the bot should have a signer uuid to post a cast
		if (!agent.signerUuid) {
			console.warn(
				`[neynar-webhook-job] Agent ${agent.fid} has no signer uuid`,
			);
			progress += increment;
			await job.updateProgress(progress);
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

		// Skip posting if no reply is needed
		if (!response.answer) {
			console.log(
				`[neynar-webhook-job] No reply needed for fid ${fid}, skipping cast`,
			);
			progress += increment;
			await job.updateProgress(progress);
			continue;
		}

		const parentHash = cast.hash;
		const newCast = await postCastToFarcaster({
			signerUuid: agent.signerUuid,
			text: response.answer,
			embeds: [],
			parentHash,
			idempotencyKey: uuidv4(),
			authorFid: cast.author.fid,
		});
		console.log(
			"new cast posted to farcaster",
			JSON.stringify(newCast, null, 2),
		);
		// save agent cast to db
		await createAgentCast({
			id: uuidv4(),
			agentFid: agent.fid,
			castHash: newCast.cast.hash,
			castText: response.answer,
			parentCastHash: parentHash,
			parentCastText: question,
			parentCastAuthorFid: cast.author.fid,
		});

		await upsertUserMetadata({
			fid: cast.author.fid,
			username: cast.author.username,
			displayName: cast.author.displayName,
			bio: cast.author.bio,
			avatarUrl: cast.author.avatarUrl,
		});

		progress += increment;
		await job.updateProgress(progress);
	}

	return {
		status: "success",
		message: `Neynar webhook job completed for cast ${cast.createdAt}`,
	};
}
