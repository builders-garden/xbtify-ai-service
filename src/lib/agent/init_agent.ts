import { HumanMessage } from "@langchain/core/messages";
import { END, START, StateGraph } from "@langchain/langgraph";
import { InitAgentState, langfuseHandler, llm } from "./langgraph.js";
import { extractJSON, preprocessCastsFile } from "./utils.js";

// Profiler Node - Takes casts and replies of a farcaster user and returns a base prompt regarding user's style, tone, and content.
async function profilerNode(
	state: typeof InitAgentState.State,
): Promise<Partial<typeof InitAgentState.State>> {
	const { casts } = state;
	console.log("[ProfilerNode] Processing casts and replies.");
	const prompt = `
  You are a meticulous linguistic analyst AI agent. Your specific task is to read and analyze a collection of social media posts from a single user. 
  Based on this analysis, you will create a structured "style profile" in JSON format. This profile is not for human consumption; it is designed to be the core of a system prompt for another AI agent, enabling that agent to perfectly emulate the user's writing style. 
  Your analysis must be objective, detailed, and directly derivable from the provided text.

  ### DATA DESCRIPTION ###

  You will be given a list of USER POSTS from a specific user on Farcaster. 
  Your objective is to synthesize this data to understand the user's communication patterns, personality as expressed through text, and recurring interests. 
  You must identify the subtle nuances that make their style unique.
  The input data will be provided as a JSON array of strings, where each string is a single post or reply from the user.

  ### OUTPUT INSTRUCTION ###

  Your output MUST be a single, valid JSON object and nothing else. Do not include any explanatory text, markdown formatting, or apologies. 
  The JSON object must conform to the following structure, with each field containing a concise description and/or examples as specified:

  {{
      "tone_and_formality": "Concise description of overall tone and formality (e.g., 'Optimistic and encouraging', 'Sarcastic and witty', 'Formal and professional'). Note the level of formality and general attitude.",
      "syntax_and_structure": {
          "sentence_length": "Describe the typical sentence length (e.g., 'Mostly short(around 10 words) to medium-length(around 20 words).",
          "capitalization": "Describe the user's capitalization habits (e.g., 'Standard sentence case', 'Often uses all lowercase', 'Uses title case for emphasis').",
          "punctuation": "Describe common punctuation patterns (e.g., 'Uses exclamation points frequently', 'Minimal punctuation', 'Proper use of commas and periods').",
          "formatting": "Describe formatting choices (e.g., 'Uses line breaks for readability', 'Writes in dense paragraphs')."
        },
      "vocabulary": {
          "common_words_phrases": "An array of specific words or short phrases the user frequently uses. Example: ['let's goooo', 'super interesting']",
          "jargon": "An array of any specific slang, technical jargon, or unique idioms the user employs. Example: ['gm', 'imo', 'lol', 'ngl']"
          },
      "content_themes": "An array of the primary topics and themes the user consistently discusses. Example: ['AI models', 'developer tools', 'on-chain identity', 'real-time systems']",
  }}

  ### EXAMPLE ###

  INPUT: 
    [
    "gm everyone! another great day to build",
    "ngl, the new model from @cognosys is seriously impressive. the latency is way down.",
    "quick question for the devs in the chat: anyone have experience with vector databases for real-time similarity search? looking for recommendations.",
    "lol classic, the build always fails right before a demo.",
    "Super interesting thread on the future of decentralized identity. This is the stuff that gets me excited!",
    "Replying to @jane_dev: Yeah, I totally agree. Scalability is still the biggest hurdle for on-chain social."
    ]

  EXPECTED OUTPUT:
  {{
      "tone_and_formality": "Casual, optimistic, and collaborative. Engages with a community-focused and encouraging tone. Generally informal.",
      "syntax_and_structure": {
          "sentence_length": "Short to medium-length sentences. Easy to read and digest.",
          "capitalization": "Predominantly uses all lowercase, even for the start of sentences.",
          "punctuation": "Uses periods and question marks correctly but not strictly. Exclamation points are used for excitement.",
          "formatting": "Single sentences or short paragraphs. No complex formatting."
          },
      "vocabulary": {
          "common_words_phrases": ["impressive", "seriously", "quick question", "Super interesting"],
          "special_idioms_or_jargon": ["gm", "ngl", "devs", "lol"]
          },
      "topics_of_interest": ["AI/ML development", "Web3/Crypto", "Decentralized technology", "Software development challenges", "Community engagement"]
  }}

  ### USER POSTS ###
  ${casts}
  `;

	try {
		const response = await llm.invoke([new HumanMessage(prompt)]);
		const responseText = response.content.toString();

		// Try to extract JSON from the response
		let extractedJSON = extractJSON(responseText);

		if (extractedJSON) {
			console.log(
				"[ProfilerNode] Successfully extracted JSON from first attempt.",
			);
			return {
				response: extractedJSON,
			};
		}

		// First attempt failed, retry with more explicit prompt
		console.log(
			"[ProfilerNode] JSON extraction failed. Retrying with more explicit prompt...",
		);
		const retryPrompt = `${prompt}
    
      IMPORTANT: Your previous response could not be parsed as valid JSON. Please respond with ONLY a valid JSON object, with no markdown formatting, no code blocks, no explanations, and no additional text. Start your response with { and end with }.`;

		try {
			const retryResponse = await llm.invoke([new HumanMessage(retryPrompt)]);
			const retryResponseText = retryResponse.content.toString();

			extractedJSON = extractJSON(retryResponseText);

			if (extractedJSON) {
				console.log(
					"[ProfilerNode] Successfully extracted JSON from retry attempt.",
				);
				return {
					response: extractedJSON,
				};
			}

			// Both attempts failed, fall back to original response
			console.log(
				"[ProfilerNode] JSON extraction failed on retry. Using standard response.",
			);
			return {
				response: responseText,
			};
		} catch (retryError) {
			console.error("[ProfilerNode] Error on retry attempt:", retryError);
			// If retry fails, return the original response
			return {
				response: responseText,
			};
		}
	} catch (error) {
		console.error("[ProfilerNode] Error generating answer:", error);
		return {
			response: "I'm sorry, I couldn't process your request right now.",
		};
	}
}

// Create the simplified LangGraph workflow with a single node
function createInitAgentGraph() {
	const workflow = new StateGraph(InitAgentState)
		.addNode("profiler", profilerNode)
		.addEdge(START, "profiler")
		.addEdge("profiler", END);

	return workflow.compile();
}

// Main agent function that uses LangGraph
export async function runInitAgent(
	casts: string,
	options?: { isFilePath?: boolean },
): Promise<{
	response: string;
}> {
	console.log("[InitAgent] Starting agent...");

	try {
		// Pre-process if input is a file path
		let processedData = casts;
		if (options?.isFilePath) {
			console.log(`[InitAgent] Pre-processing file: ${casts}`);
			processedData = preprocessCastsFile(casts);
		}

		console.log(
			`[InitAgent] Processing data with ${processedData.length} characters`,
		);

		// Create the graph
		const graph = createInitAgentGraph();

		// Run the graph
		const result = await graph.invoke(
			{
				casts: processedData,
			},
			{ callbacks: [langfuseHandler] },
		);

		return {
			response: result.response || "",
		};
	} catch (error) {
		console.error("[InitAgent] Error running init agent:", error);
		return {
			response:
				"I'm sorry, there was an error processing your request. Please try again.",
		};
	}
}
