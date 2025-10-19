import type { Request, Response } from "express";
import { z } from "zod";
import {
	getAgentByFid,
	getAgentById,
} from "../lib/database/queries/agent.query.js";
import { agentInitializationQueue } from "../queues/agentInitialization.queue.js";
import { agentReinitializationQueue } from "../queues/agentReinitialization.queue.js";
import { handleAskAgent } from "../services/agent.service.js";
import { AgentStatus, QueueName } from "../types/enums.js";

const initSchema = z.object({
	fid: z.number().int().positive().min(1),
	personality: z.string().min(1),
	tone: z.string().min(1),
	movieCharacter: z.string().min(1),
	reinitialize: z.boolean().optional().default(false),
});

export const initAgentController = async (req: Request, res: Response) => {
	try {
		const safeBody = initSchema.parse(req.body);

		// check if agent with fid already exists
		const existingAgent = await getAgentByFid(safeBody.fid);
		if (existingAgent) {
			return res.status(400).json({
				status: "nok",
				message: "Agent with this fid already exists",
			});
		}

		await agentInitializationQueue.add(
			QueueName.AGENT_INITIALIZATION,
			{
				fid: safeBody.fid,
				personality: safeBody.personality,
				tone: safeBody.tone,
				movieCharacter: safeBody.movieCharacter,
			},
			{
				attempts: 1,
				removeOnComplete: true,
			},
		);

		return res.status(200).json({
			status: "ok",
			data: {
				fid: safeBody.fid,
				status: AgentStatus.INITIALIZING,
			},
		});
	} catch (error) {
		console.error("Error updating user data:", error);

		if (error instanceof z.ZodError) {
			res.status(400).json({
				status: "nok",
				message: "Invalid request data",
				errors: error.errors,
			});
		}

		return res.status(500).json({
			status: "nok",
			message: "Failed to update user data",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
};

const reinitSchema = z.object({
	deleteCasts: z.boolean().optional().default(false),
	deleteReplies: z.boolean().optional().default(false),
	personality: z.string().min(1).optional(),
	tone: z.string().min(1).optional(),
	movieCharacter: z.string().min(1).optional(),
});

export const reinitializeAgentController = async (
	req: Request,
	res: Response,
) => {
	try {
		const fid = Number.parseInt(req.params.fid, 10);
		if (!fid || Number.isNaN(Number(fid))) {
			return res.status(400).json({
				status: "nok",
				message: "Agent FID is required",
			});
		}

		const existingAgent = await getAgentByFid(fid);

		if (!existingAgent) {
			return res.status(404).json({
				status: "nok",
				message: "Agent not found",
			});
		}

		const safeBody = reinitSchema.parse(req.body);

		await agentReinitializationQueue.add(
			QueueName.AGENT_REINITIALIZATION,
			{
				fid: existingAgent.fid,
				creatorFid: existingAgent.creatorFid,
				deleteCasts: safeBody.deleteCasts,
				deleteReplies: safeBody.deleteReplies,
				personality: safeBody.personality,
				tone: safeBody.tone,
				movieCharacter: safeBody.movieCharacter,
			},
			{
				attempts: 2,
				removeOnComplete: true,
			},
		);

		return res.status(200).json({
			status: "ok",
			data: {
				id: existingAgent.id,
				fid: existingAgent.fid,
				status: AgentStatus.REINITIALIZING,
				createdAt: existingAgent.createdAt,
				updatedAt: existingAgent.updatedAt,
				creatorFid: existingAgent.creatorFid,
			},
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				status: "nok",
				message: "Invalid request data",
				errors: error.errors,
			});
		}

		console.error("Error reinitializing agent:", error);
		return res.status(500).json({
			status: "nok",
			message: "Failed to reinitialize agent",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
};

export const getAgentInfoController = async (req: Request, res: Response) => {
	try {
		const id = req.params.id;
		if (!id) {
			return res.status(400).json({
				status: "nok",
				message: "Agent ID is required",
			});
		}

		const existingAgent = await getAgentById(id);

		if (!existingAgent) {
			return res.status(404).json({
				status: "nok",
				message: "Agent not found",
			});
		}

		return res.status(200).json({
			status: "ok",
			data: existingAgent,
		});
	} catch (error) {
		console.error("Error fetching agent info:", error);
		return res.status(500).json({
			status: "nok",
			message: "Failed to fetch agent info",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
};

const askAgentSchema = z.object({
	question: z.string().min(1),
});

export const handleAskAgentController = async (req: Request, res: Response) => {
  try {
    const fid = parseInt(req.params.id, 10);

    if (!fid) {
      return res.status(400).json({
        status: "nok",
        message: "Agent FID is required",
      });
    }

		const safeBody = askAgentSchema.parse(req.body);

    const agent = await getAgentByFid(fid);

		if (!agent) {
			return res.status(404).json({
				status: "nok",
				message: "Agent not found",
			});
		}

		const response = await handleAskAgent({
			agent,
			question: safeBody.question,
		});

		// Placeholder response
		return res.status(200).json({
			status: "ok",
			data: response,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				status: "nok",
				message: "Invalid request data",
				errors: error.errors,
			});
		}

		console.error("Error handling ask agent:", error);
		return res.status(500).json({
			status: "nok",
			message: "Failed to handle ask agent",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
};
