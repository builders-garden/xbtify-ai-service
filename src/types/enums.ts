export enum AgentStatus {
	REINITIALIZING = "reinitializing",
	INITIALIZING = "initializing",
	READY = "ready",
	ERROR = "error",
}

export enum QueueName {
	AGENT_INITIALIZATION = "agent-initialization",
	AGENT_REINITIALIZATION = "agent-reinitialization",
	NEYNAR_WEBHOOK = "neynar-webhook",
}
