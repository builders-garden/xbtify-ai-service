import { eq, inArray } from "drizzle-orm";
import {
	type CreateReply,
	type Reply,
	replyTable,
	type UpdateReply,
} from "../db.schema.js";
import { db } from "../index.js";

/**
 * Get reply by hash
 */
export async function getReplyByHash(hash: string): Promise<Reply | undefined> {
	const [reply] = await db
		.select()
		.from(replyTable)
		.where(eq(replyTable.hash, hash))
		.limit(1);
	return reply;
}

/**
 * Get replies by FID
 */
export async function getRepliesByFid(fid: number): Promise<Reply[]> {
	const replies = await db
		.select()
		.from(replyTable)
		.where(eq(replyTable.fid, fid));
	return replies;
}

/**
 * Create a new reply
 */
export async function createReply(reply: CreateReply): Promise<Reply> {
	const [newReply] = await db.insert(replyTable).values(reply).returning();
	return newReply;
}

/**
 * Create multiple replies
 */
export async function createReplies(replies: CreateReply[]): Promise<Reply[]> {
	if (replies.length === 0) return [];
	const newReplies = await db.insert(replyTable).values(replies).returning();
	return newReplies;
}

/**
 * Update a reply by hash
 */
export async function updateReply(
	hash: string,
	updates: UpdateReply,
): Promise<Reply | undefined> {
	const [updatedReply] = await db
		.update(replyTable)
		.set(updates)
		.where(eq(replyTable.hash, hash))
		.returning();
	return updatedReply;
}

/**
 * Delete a reply by hash
 */
export async function deleteReply(hash: string): Promise<Reply | undefined> {
	const [deletedReply] = await db
		.delete(replyTable)
		.where(eq(replyTable.hash, hash))
		.returning();
	return deletedReply;
}

/**
 * Delete multiple replies by hashes
 */
export async function deleteReplies(hashes: string[]): Promise<Reply[]> {
	if (hashes.length === 0) return [];
	const deletedReplies = await db
		.delete(replyTable)
		.where(inArray(replyTable.hash, hashes))
		.returning();
	return deletedReplies;
}

/**
 * Delete all replies by FID
 */
export async function deleteAllRepliesByFid(fid: number): Promise<number> {
	const deletedReplies = await db
		.delete(replyTable)
		.where(eq(replyTable.fid, fid))
		.returning();
	return deletedReplies.length;
}
