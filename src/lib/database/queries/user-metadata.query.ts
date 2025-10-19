import { eq } from "drizzle-orm";
import { db } from "../index.js";
import type {
	CreateUserMetadata,
	UpdateUserMetadata,
	UserMetadata,
} from "../db.schema.js";
import { userMetadataTable } from "../db.schema.js";

/**
 * Get user metadata by FID
 */
export const getUserMetadataByFid = async (
	fid: number,
): Promise<UserMetadata | undefined> => {
	const [userMetadata] = await db
		.select()
		.from(userMetadataTable)
		.where(eq(userMetadataTable.fid, fid))
		.limit(1);

	return userMetadata;
};

/**
 * Get user metadata by username
 */
export const getUserMetadataByUsername = async (
	username: string,
): Promise<UserMetadata | undefined> => {
	const [userMetadata] = await db
		.select()
		.from(userMetadataTable)
		.where(eq(userMetadataTable.username, username))
		.limit(1);

	return userMetadata;
};

/**
 * Get all user metadata
 */
export const getAllUserMetadata = async (): Promise<UserMetadata[]> => {
	return await db.select().from(userMetadataTable);
};

/**
 * Create user metadata
 */
export const createUserMetadata = async (
	data: CreateUserMetadata,
): Promise<UserMetadata> => {
	const [userMetadata] = await db
		.insert(userMetadataTable)
		.values(data)
		.returning();

	return userMetadata;
};

/**
 * Update user metadata by FID
 */
export const updateUserMetadataByFid = async (
	fid: number,
	data: UpdateUserMetadata,
): Promise<UserMetadata | undefined> => {
	const [updatedUserMetadata] = await db
		.update(userMetadataTable)
		.set(data)
		.where(eq(userMetadataTable.fid, fid))
		.returning();

	return updatedUserMetadata;
};

/**
 * Upsert user metadata (insert or update if exists)
 */
export const upsertUserMetadata = async (
	data: CreateUserMetadata,
): Promise<UserMetadata> => {
	const [userMetadata] = await db
		.insert(userMetadataTable)
		.values(data)
		.onConflictDoUpdate({
			target: userMetadataTable.fid,
			set: {
				username: data.username,
				displayName: data.displayName,
				bio: data.bio,
				avatarUrl: data.avatarUrl,
			},
		})
		.returning();

	return userMetadata;
};

/**
 * Delete user metadata by FID
 */
export const deleteUserMetadataByFid = async (
	fid: number,
): Promise<UserMetadata | undefined> => {
	const [deletedUserMetadata] = await db
		.delete(userMetadataTable)
		.where(eq(userMetadataTable.fid, fid))
		.returning();

	return deletedUserMetadata;
};

/**
 * Batch create or update user metadata
 */
export const batchUpsertUserMetadata = async (
	data: CreateUserMetadata[],
): Promise<UserMetadata[]> => {
	if (data.length === 0) return [];

	const userMetadata = await db
		.insert(userMetadataTable)
		.values(data)
		.onConflictDoUpdate({
			target: userMetadataTable.fid,
			set: {
				username: userMetadataTable.username,
				displayName: userMetadataTable.displayName,
				bio: userMetadataTable.bio,
				avatarUrl: userMetadataTable.avatarUrl,
			},
		})
		.returning();

	return userMetadata;
};
