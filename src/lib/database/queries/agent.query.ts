import { eq } from "drizzle-orm";
import { db } from "../index.js";
import {
  agentTable,
  type Agent,
  type CreateAgent,
  type UpdateAgent,
} from "../db.schema.js";

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
  updates: UpdateAgent
): Promise<Agent | undefined> {
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
