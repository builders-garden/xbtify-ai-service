import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { env } from "../config/env.js";
import { agentInitializationQueue } from "../queues/agentInitialization.queue.js";
import { agentReinitializationQueue } from "../queues/agentReinitialization.queue.js";
import { neynarWebhookQueue } from "../queues/neynar.queue.js";

export const getBullboardRouter = (basePath: string) => {
	console.log(`🧭 Bull Board: http://localhost:${env.PORT}${basePath}`);

	const serverAdapter = new ExpressAdapter();
	serverAdapter.setBasePath(basePath);

	createBullBoard({
		queues: [
			new BullMQAdapter(agentInitializationQueue, {
				allowRetries: false,
			}),
			new BullMQAdapter(agentReinitializationQueue, {
				allowRetries: false,
			}),
			new BullMQAdapter(neynarWebhookQueue, {
				allowRetries: false,
			}),
		],
		serverAdapter,
	});
	return serverAdapter.getRouter();
};
