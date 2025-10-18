import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { agentInitializationQueue } from "../queues/agentInitialization.queue.js";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
	queues: [
		new BullMQAdapter(agentInitializationQueue, {
			allowRetries: false,
		}),
	],
	serverAdapter,
});

export { serverAdapter as bullBoardAdapter };
