import type { Cast } from "../database/db.schema.js";
import type { ChunkData } from "./types.js";

const MAX_CHUNK_SIZE = 3000;
const CAST_SEPARATOR = "\n\n";

/**
 * Chunks casts into groups of approximately MAX_CHUNK_SIZE characters
 * without splitting individual casts across chunks.
 * 
 * @param casts - Array of Cast objects to chunk
 * @param creatorFid - The Farcaster ID of the cast creator
 * @returns Array of ChunkData objects with chunk_number, text, and creatorFid
 */
export function chunkCasts(casts: Cast[], creatorFid: number): ChunkData[] {
	const chunks: ChunkData[] = [];
	let currentChunk: string[] = [];
	let currentSize = 0;
	let chunkNumber = 0;

	for (const cast of casts) {
		const castText = cast.text;
		const castLength = castText.length;

		// If adding this cast would exceed MAX_CHUNK_SIZE and we already have content
		if (currentSize + castLength + CAST_SEPARATOR.length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
			// Save current chunk
			chunks.push({
				chunk_number: chunkNumber++,
				text: currentChunk.join(CAST_SEPARATOR),
				creatorFid,
			});
			
			// Start new chunk
			currentChunk = [castText];
			currentSize = castLength;
		} else {
			// Add cast to current chunk
			currentChunk.push(castText);
			currentSize += castLength + (currentChunk.length > 1 ? CAST_SEPARATOR.length : 0);
		}
	}

	// Add the last chunk if it has content
	if (currentChunk.length > 0) {
		chunks.push({
			chunk_number: chunkNumber,
			text: currentChunk.join(CAST_SEPARATOR),
			creatorFid,
		});
	}

	console.log(`[chunking] Created ${chunks.length} chunks from ${casts.length} casts`);
	return chunks;
}

