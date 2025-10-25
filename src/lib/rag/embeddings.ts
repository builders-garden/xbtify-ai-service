import { OpenAIEmbeddings } from "@langchain/openai";
import { env } from "../../config/env.js";

const MODEL_NAME = "text-embedding-3-large";
let embeddingModel: OpenAIEmbeddings | null = null;

/**
 * Initializes the OpenAI embedding model lazily (on first use)
 */
function getEmbeddingModel(): OpenAIEmbeddings {
	if (!embeddingModel) {
		console.log(`[embeddings] Initializing OpenAI model: ${MODEL_NAME}...`);
		embeddingModel = new OpenAIEmbeddings({
			apiKey: env.OPENAI_API_KEY,
			model: MODEL_NAME,
			dimensions: 768,
		});
		console.log("[embeddings] Model initialized successfully");
	}
	return embeddingModel;
}

/**
 * Creates embeddings for an array of texts using OpenAI's text-embedding-3-large model
 *
 * @param texts - Array of text strings to embed
 * @returns Promise resolving to array of embeddings (each embedding is a 768-dimensional vector)
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
	console.log(`[embeddings] Creating embeddings for ${texts.length} texts...`);

	const model = getEmbeddingModel();
	const embeddings = await model.embedDocuments(texts);

	console.log(
		`[embeddings] Generated ${embeddings.length} embeddings (dimension: ${embeddings[0]?.length || 0})`,
	);
	return embeddings;
}

/**
 * Creates a single embedding for a query text
 *
 * @param text - Text string to embed
 * @returns Promise resolving to a 768-dimensional embedding vector
 */
export async function createQueryEmbedding(text: string): Promise<number[]> {
	const model = getEmbeddingModel();
	const embedding = await model.embedQuery(text);
	return embedding;
}
