import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { env } from "../../config/env.js";
import { createQueryEmbedding } from "./embeddings.js";

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
 * Custom embeddings class for LangChain that uses our Xenova embeddings
 */
class OpenAIEmbeddings {
	async embedDocuments(texts: string[]): Promise<number[][]> {
		// This shouldn't be called in retrieval, but implementing for completeness
		const { createEmbeddings } = await import("./embeddings.js");
		return createEmbeddings(texts);
	}

	async embedQuery(text: string): Promise<number[]> {
		return createQueryEmbedding(text);
	}
}

/**
 * Retrieves relevant context from Pinecone based on a query
 *
 * @param creatorFid - The Farcaster ID to filter results by
 * @param query - The user's question/query
 * @param topK - Number of top results to retrieve (default: 3)
 * @returns Promise resolving to array of relevant text chunks
 */
export async function retrieveContext(
	creatorFid: number,
	query: string,
	topK = 3,
): Promise<string[]> {
	const indexName = "farcaster";
	console.log(
		`[retrieval] Retrieving context for query from index: ${indexName} (creatorFid: ${creatorFid})`,
	);

	try {
		const pc = getPineconeClient();
		const index = pc.index(indexName);

		// Create custom embeddings instance
		const embeddings = new OpenAIEmbeddings();

		// Initialize PineconeStore with the index
		const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
			pineconeIndex: index,
		});

		// Perform similarity search with creatorFid filter
		const results = await vectorStore.similaritySearch(query, topK, {
			creatorFid,
		});

		// Extract text content from results
		const contexts = results.map((doc) => doc.pageContent);

		console.log(`[retrieval] Retrieved ${contexts.length} relevant chunks`);
		return contexts;
	} catch (error) {
		console.error("[retrieval] Error retrieving context:", error);
		// Return empty array if retrieval fails (e.g., index doesn't exist yet)
		return [];
	}
}
