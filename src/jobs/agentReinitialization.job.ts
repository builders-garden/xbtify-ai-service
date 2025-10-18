import { reinitializeAgent } from "../services/agent.service.js";

type AgentReinitializationOptions = {
	fid: number;
};

export async function processAgentReinitialization(
	agentReinitializationOptions: AgentReinitializationOptions,
) {
	const { fid, importedCasts } = await reinitializeAgent(
		agentReinitializationOptions,
	);
	return {
		success: true,
		message: `Agent re-initialized for user ${fid} with ${importedCasts} casts imported.`,
	};
}
