import { eq } from "drizzle-orm";
import { type User, userTable } from "../db.schema.js";
import { db } from "../index.js";

/**
 * Get a user from their Farcaster fid
 * @param fid - The Farcaster fid of the user
 * @returns The user or null if the user is not found
 */
export async function getUserFromFid(fid: number): Promise<User | null> {
	if (fid < 0) {
		return null;
	}

	const row = await db.query.userTable.findFirst({
		where: eq(userTable.farcasterFid, fid),
		with: {
			wallets: true,
		},
	});

	return row ?? null;
}
