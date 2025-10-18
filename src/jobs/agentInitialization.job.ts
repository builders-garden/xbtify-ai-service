import { initAgent } from "../services/agent.service.js";
import type { AgentInitJobData, JobResult } from "../types/queue.type.js";

export async function processAgentInitialization(
	agentInitializationOptions: AgentInitJobData,
): Promise<JobResult> {
	const { fid, importedCasts } = await initAgent(agentInitializationOptions);
	return {
		status: "success",
		message: `Agent initialized for user ${fid} with ${importedCasts} casts imported.`,
	};
}
