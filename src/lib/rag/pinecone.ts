import { Pinecone } from "@pinecone-database/pinecone";
import { env } from "../../config/env.js";
import type { ChunkData } from "./types.js";

const EMBEDDING_DIMENSION = 768;
const METRIC = "cosine";

let pineconeClient: Pinecone | null = null;

/**
 * Initializes and returns the Pinecone client
 */
function getPineconeClient(): Pinecone {
	if (!pineconeClient) {
		pineconeClient = new Pinecone({
			apiKey: env.PINECONE_API_KEY,
		});
	}
	return pineconeClient;
}

/**
 * Creates a Pinecone index if it doesn't exist and uploads chunk embeddings
 *
 * @param chunks - Array of ChunkData objects containing text content and creatorFid
 * @param embeddings - Array of embedding vectors (768-dimensional)
 */
export async function createAndUploadToPinecone(
	chunks: ChunkData[],
	embeddings: number[][],
): Promise<void> {
	const indexName = "farcaster";
	console.log(`[pinecone] Starting upload to index: ${indexName}`);

	if (chunks.length !== embeddings.length) {
		throw new Error(
			`Mismatch: ${chunks.length} chunks but ${embeddings.length} embeddings`,
		);
	}

	const pc = getPineconeClient();

	// Check if index exists
	const indexList = await pc.listIndexes();
	const indexExists = indexList.indexes?.some((idx) => idx.name === indexName);

	if (!indexExists) {
		console.log(`[pinecone] Creating new index: ${indexName}`);
		await pc.createIndex({
			name: indexName,
			dimension: EMBEDDING_DIMENSION,
			metric: METRIC,
			spec: {
				serverless: {
					cloud: "aws",
					region: "us-east-1",
				},
			},
		});

		// Wait for index to be ready
		console.log("[pinecone] Waiting for index to be ready...");
		await waitForIndexReady(pc, indexName);
	} else {
		console.log(`[pinecone] Index already exists: ${indexName}`);
	}

	// Get the index
	const index = pc.index(indexName);

	// Prepare vectors for upsert
	const vectors = chunks.map((chunk, idx) => ({
		id: `chunk-${chunk.creatorFid}-${chunk.chunk_number}`,
		values: embeddings[idx],
		metadata: {
			text: chunk.text,
			chunk_number: chunk.chunk_number,
			creatorFid: chunk.creatorFid,
		},
	}));

	// Upsert vectors in batches of 100
	const batchSize = 100;
	for (let i = 0; i < vectors.length; i += batchSize) {
		const batch = vectors.slice(i, i + batchSize);
		await index.upsert(batch);
		console.log(
			`[pinecone] Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`,
		);
	}

	console.log(
		`[pinecone] Successfully uploaded ${vectors.length} vectors to ${indexName}`,
	);
}

/**
 * Waits for a Pinecone index to be ready
 */
async function waitForIndexReady(
	pc: Pinecone,
	indexName: string,
	maxAttempts = 30,
): Promise<void> {
	for (let i = 0; i < maxAttempts; i++) {
		const indexDescription = await pc.describeIndex(indexName);
		if (indexDescription.status?.ready) {
			console.log(`[pinecone] Index ${indexName} is ready`);
			return;
		}
		console.log(
			`[pinecone] Waiting for index... (attempt ${i + 1}/${maxAttempts})`,
		);
		await new Promise((resolve) => setTimeout(resolve, 2000));
	}
	throw new Error(`Index ${indexName} did not become ready in time`);
}

/**
 * Deletes a Pinecone index
 *
 * @param indexName - Name of the index to delete
 */
export async function deleteIndex(indexName: string): Promise<void> {
	console.log(`[pinecone] Deleting index: ${indexName}`);
	const pc = getPineconeClient();
	await pc.deleteIndex(indexName);
	console.log(`[pinecone] Index deleted: ${indexName}`);
}
