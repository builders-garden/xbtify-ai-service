import { reinitializeAgent } from "../services/agent.service.js";
import type { AgentReinitJobData } from "../types/queue.type.js";

export async function processAgentReinitialization(
	agentReinitializationOptions: AgentReinitJobData,
) {
	const { fid, importedCasts } = await reinitializeAgent(
		agentReinitializationOptions,
	);
	return {
		success: true,
		message: `Agent re-initialized for user ${fid} with ${importedCasts} casts imported.`,
	};
}
