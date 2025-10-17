import { eq, inArray } from "drizzle-orm";
import { db } from "../index.js";
import {
  castTable,
  type Cast,
  type CreateCast,
  type UpdateCast,
} from "../db.schema.js";

/**
 * Get cast by hash
 */
export async function getCastByHash(hash: string): Promise<Cast | undefined> {
  const [cast] = await db
    .select()
    .from(castTable)
    .where(eq(castTable.hash, hash))
    .limit(1);
  return cast;
}

/**
 * Get casts by FID
 */
export async function getCastsByFid(fid: number): Promise<Cast[]> {
  const casts = await db.select().from(castTable).where(eq(castTable.fid, fid));
  return casts;
}

/**
 * Create a new cast
 */
export async function createCast(cast: CreateCast): Promise<Cast> {
  const [newCast] = await db.insert(castTable).values(cast).returning();
  return newCast;
}

/**
 * Create multiple casts
 */
export async function createCasts(casts: CreateCast[]): Promise<Cast[]> {
  if (casts.length === 0) return [];
  const newCasts = await db.insert(castTable).values(casts).returning();
  return newCasts;
}

/**
 * Update a cast by hash
 */
export async function updateCast(
  hash: string,
  updates: UpdateCast
): Promise<Cast | undefined> {
  const [updatedCast] = await db
    .update(castTable)
    .set(updates)
    .where(eq(castTable.hash, hash))
    .returning();
  return updatedCast;
}

/**
 * Delete a cast by hash
 */
export async function deleteCast(hash: string): Promise<Cast | undefined> {
  const [deletedCast] = await db
    .delete(castTable)
    .where(eq(castTable.hash, hash))
    .returning();
  return deletedCast;
}

/**
 * Delete multiple casts by hashes
 */
export async function deleteCasts(hashes: string[]): Promise<Cast[]> {
  if (hashes.length === 0) return [];
  const deletedCasts = await db
    .delete(castTable)
    .where(inArray(castTable.hash, hashes))
    .returning();
  return deletedCasts;
}

/**
 * Delete all casts
 */
export async function deleteAllCastsByFid(fid: number): Promise<number> {
  const deletedCasts = await db
    .delete(castTable)
    .where(eq(castTable.fid, fid))
    .returning();
  return deletedCasts.length;
}
