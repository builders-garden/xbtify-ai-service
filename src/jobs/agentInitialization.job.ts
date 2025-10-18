import { initAgent } from "../services/agent.service.js";

type AgentInitializationOptions = {
	fid: number;
};

export async function processAgentInitialization(
	agentInitializationOptions: AgentInitializationOptions,
) {
	const { fid, importedCasts } = await initAgent(agentInitializationOptions);
	return {
		success: true,
		message: `Agent initialized for user ${fid} with ${importedCasts} casts imported.`,
	};
}
