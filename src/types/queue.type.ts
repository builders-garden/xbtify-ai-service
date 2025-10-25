import { z } from "zod";

export interface NeynarWebhookJobData {
	cast: {
		hash: string;
		text: string;
		createdAt: Date;
		mentionedFids: number[];
		url: string;
		author: {
			fid: number;
			username: string;
			displayName?: string;
			bio?: string;
			avatarUrl?: string;
		};
	};
}

export type AgentInitJobData = {
	creatorFid: number;
	personality: string;
	tone: string;
	movieCharacter: string;
};

export type AgentReinitJobData = {
	creatorFid: number;
	fid: number;
	deleteCasts: boolean;
	deleteReplies: boolean;
	onlyRAG: boolean;
	personality: string;
	tone: string;
	movieCharacter: string;
};

const jobResultSuccessSchema = z.object({
	status: z.literal("success"),
	message: z.string(),
});

const jobResultFailedSchema = z.object({
	status: z.literal("failed"),
	error: z.string(),
});

export const jobResultSchema = z.union([
	jobResultSuccessSchema,
	jobResultFailedSchema,
]);

export type JobResult = z.infer<typeof jobResultSchema>;

const jobProgressPendingSchema = z.object({
	status: z.literal("pending"),
	progress: z.number(),
});

const jobProgressActiveSchema = z.object({
	status: z.literal("active"),
	progress: z.number(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

const jobProgressCompletedSchema = z.object({
	status: z.literal("completed"),
	progress: z.number(),
	result: jobResultSchema,
	createdAt: z.date(),
	updatedAt: z.date(),
});

const jobProgressFailedSchema = z.object({
	status: z.literal("failed"),
	progress: z.number(),
	error: z.string(),
	result: jobResultSchema,
	attemptsMade: z.number(),
	attemptsRemaining: z.number(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

const jobProgressDelayedSchema = z.object({
	status: z.literal("delayed"),
	progress: z.number(),
	delayReason: z.string(),
	processAt: z.date(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

const jobProgressWaitingSchema = z.object({
	status: z.literal("waiting"),
	progress: z.number(),
	position: z.number(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const jobProgressSchema = z.union([
	jobProgressPendingSchema,
	jobProgressActiveSchema,
	jobProgressCompletedSchema,
	jobProgressFailedSchema,
	jobProgressDelayedSchema,
	jobProgressWaitingSchema,
]);

export type JobProgress = z.infer<typeof jobProgressSchema>;
