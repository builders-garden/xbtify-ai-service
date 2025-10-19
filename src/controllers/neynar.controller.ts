import type { Request, Response } from "express";
import { neynarWebhookQueue } from "../queues/neynar.queue.js";
import { QueueName } from "../types/enums.js";
import { allWebhookEventsSchema } from "../types/neynar.js";

export const neynarWebhookController = async (req: Request, res: Response) => {
	try {
		const parseBody = allWebhookEventsSchema.safeParse(req.body);
		if (!parseBody.success) {
			console.error("Invalid request body", parseBody.error.message);
			res.status(400).json({
				status: "error",
				error: "Invalid request",
			});
			return;
		}

		const webhookEvent = parseBody.data;
		if (webhookEvent.type !== "cast.created") {
			console.warn("Invalid webhook event type", webhookEvent.type);
			res.status(200).json({
				status: "success",
				message: "Invalid webhook event type",
			});
			return;
		}

		const cast = webhookEvent.data;
		const createdAt = webhookEvent.created_at;
		const mentionedFids = cast.mentioned_profiles.map((profile) => profile.fid);

		const job = await neynarWebhookQueue.add(
			`process-${QueueName.NEYNAR_WEBHOOK}`,
			{
				cast: {
					hash: cast.hash,
					text: cast.text,
					createdAt: new Date(createdAt),
					mentionedFids,
					url: `https://farcaster.xyz/${cast.author.username}/${cast.hash}`,
					author: {
						fid: cast.author.fid,
						username: cast.author.username,
						displayName: cast.author.display_name,
						bio: cast.author.profile.bio.text,
						avatarUrl: cast.author.pfp_url,
					},
				},
			},
		);
		console.log("job added", JSON.stringify(job, null, 2));

		res.status(202).json({
			status: "ok",
			data: job,
		});
	} catch (error) {
		console.error("Error updating user data:", error);
		res.status(500).json({
			message: "Failed to update user data",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
};
