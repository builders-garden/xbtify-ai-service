import { eq, or } from "drizzle-orm";
import {
	type Agent,
	type AgentCast,
	agentCastTable,
	agentTable,
	type CreateAgent,
	type CreateAgentCast,
	type UpdateAgent,
} from "../db.schema.js";
import { db } from "../index.js";

/**
 * Get agent by FID
 */
export async function getAgentByFid(fid: number): Promise<Agent | undefined> {
	const [agent] = await db
		.select()
		.from(agentTable)
		.where(eq(agentTable.fid, fid))
		.limit(1);
	return agent;
}

/**
 * Get agent by FID or creator FID
 * @param fid - The FID of the agent
 * @param creatorFid - The creator FID of the agent
 * @returns
 */
export async function getAgentByCreatorFidOrFid(
	fid: number,
): Promise<Agent | undefined> {
	const agent = await db.query.agentTable.findFirst({
		where: or(eq(agentTable.fid, fid), eq(agentTable.creatorFid, fid)),
	});
	return agent;
}

/**
 * Get all agent FIDs
 * @returns All agent FIDs
 */
export async function getAllAgentsFids(): Promise<number[]> {
	const fids = await db.query.agentTable.findMany({
		columns: {
			fid: true,
		},
	});
	return fids.map((row) => row.fid);
}

/**
 * Get agent by ID
 */
export async function getAgentById(id: string): Promise<Agent | undefined> {
	const [agent] = await db
		.select()
		.from(agentTable)
		.where(eq(agentTable.id, id))
		.limit(1);
	return agent;
}

/**
 * Create a new agent
 */
export async function createAgent(agent: CreateAgent): Promise<Agent> {
	const [newAgent] = await db.insert(agentTable).values(agent).returning();
	return newAgent;
}

/**
 * Update an agent by ID
 */
export async function updateAgent(
	id: string,
	updates: UpdateAgent,
): Promise<Agent> {
	const [updatedAgent] = await db
		.update(agentTable)
		.set({
			...updates,
			updatedAt: new Date(),
		})
		.where(eq(agentTable.id, id))
		.returning();
	return updatedAgent;
}

/**
 * Create a new agent cast
 * @param cast - The agent cast to create
 * @returns The created agent cast
 */
export async function createAgentCast(
	cast: CreateAgentCast,
): Promise<AgentCast> {
	const [newCast] = await db.insert(agentCastTable).values(cast).returning();
	return newCast;
}
