import { StateGraph, START, END } from '@langchain/langgraph';
import { extractJSON, preprocessCastsFile, preprocessRepliesFile } from './utils.js';
import { InitAgentState, llm } from './langgraph.js';
import { CallbackHandler } from "langfuse-langchain";
import { HumanMessage } from '@langchain/core/messages';

// ReadCast Node - Analyzes casts to extract vocabulary and keywords
async function readCastNode(state: typeof InitAgentState.State): Promise<Partial<typeof InitAgentState.State>> {
  const { casts } = state;
  console.log(`[ReadCastNode] Processing casts.`);
  const prompt = `
  You are a meticulous linguistic analyst AI agent. Your specific task is to read and analyze a collection of social media posts from a single user. 
  Based on this analysis, you will extract vocabulary patterns and identify key topics the user discusses.
  Your analysis must be objective, detailed, and directly derivable from the provided text.

  ### DATA DESCRIPTION ###

  You will be given a list of USER POSTS from a specific user on Farcaster. 
  Your objective is to identify the vocabulary patterns and key topics/themes that the user discusses.
  The input data will be provided as a JSON array of strings, where each string is a single post from the user.

  ### OUTPUT INSTRUCTION ###

  Your output MUST be a single, valid JSON object and nothing else. Do not include any explanatory text, markdown formatting, or apologies. 
  The JSON object must conform to the following structure:

  {{
      "vocabulary": {{
          "common_phrases": ["phrase1", "phrase2", "phrase3"],
          "jargon": ["jargon1", "jargon2", "jargon3"],
          "filler_words": ["filler1", "filler2", "filler3"]
      }},
      "keywords": {{
          "topic_key1": "Brief description of topic",
          "topic_key2": "Brief description of topic",
          "topic_key3": "Brief description of topic"
      }}
  }}

  ### FIELD DESCRIPTIONS ###

  - **common_phrases**: An array of specific multi-word phrases the user frequently uses (e.g., "let's go", "super interesting", "quick question")
  - **jargon**: An array of specific slang, technical jargon, abbreviations, or unique idioms the user employs (e.g., "gm", "ngl", "imo", "lol")
  - **filler_words**: An array of words the user commonly uses as fillers or verbal tics (e.g., "basically", "honestly", "literally")
  - **keywords**: An object where each key is a topic keyword and the value is a brief description of what that topic represents in the user's posts

  ### EXAMPLE ###

  INPUT: 
    [
    {{"text": "gm everyone! another great day to build"}},
    {{"text": "ngl, the new model from @cognosys is seriously impressive. the latency is way down."}},
    {{"text": "quick question for the devs in the chat: anyone have experience with vector databases for real-time similarity search? looking for recommendations."}},
    {{"text": "lol classic, the build always fails right before a demo."}},
    {{"text": "Super interesting thread on the future of decentralized identity. This is the stuff that gets me excited!"}},
    {{"text": "honestly, I think scalability is still the biggest hurdle for on-chain social."}}
    ]

  EXPECTED OUTPUT:
  {{
      "vocabulary": {{
          "common_phrases": ["quick question", "super interesting", "great day", "looking for recommendations"],
          "jargon": ["gm", "ngl", "lol", "devs", "on-chain"],
          "filler_words": ["honestly", "seriously", "classic"]
      }},
      "keywords": {{
          "ai_ml": "Discussions about AI/ML models, latency, and performance",
          "web3": "Topics related to decentralized identity and blockchain social platforms",
          "developer_tools": "Questions and discussions about databases, development tools, and technical infrastructure",
          "community": "Community engagement and collaboration with other developers"
      }}
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
      console.log('[ReadCastNode] Successfully extracted JSON from first attempt.');
      return {
        castAnalysis: extractedJSON
      };
    }
    
    // First attempt failed, retry with more explicit prompt
    console.log('[ReadCastNode] JSON extraction failed. Retrying with more explicit prompt...');
    const retryPrompt = `${prompt}
    
      IMPORTANT: Your previous response could not be parsed as valid JSON. Please respond with ONLY a valid JSON object, with no markdown formatting, no code blocks, no explanations, and no additional text. Start your response with { and end with }.`;
    
    try {
      const retryResponse = await llm.invoke([new HumanMessage(retryPrompt)]);
      const retryResponseText = retryResponse.content.toString();
      
      extractedJSON = extractJSON(retryResponseText);
      
      if (extractedJSON) {
        console.log('[ReadCastNode] Successfully extracted JSON from retry attempt.');
        return {
          castAnalysis: extractedJSON
        };
      }
      
      // Both attempts failed, fall back to original response
      console.log('[ReadCastNode] JSON extraction failed on retry. Using standard response.');
      return {
        castAnalysis: responseText
      };
    } catch (retryError) {
      console.error('[ReadCastNode] Error on retry attempt:', retryError);
      // If retry fails, return the original response
      return {
        castAnalysis: responseText
      };
    }
  } catch (error) {
    console.error('[ReadCastNode] Error generating answer:', error);
    return {
      castAnalysis: "I'm sorry, I couldn't process your request right now."
    };
  }
}

// ReadReplies Node - Analyzes replies to extract tone, syntax, and patterns per topic
async function readRepliesNode(state: typeof InitAgentState.State): Promise<Partial<typeof InitAgentState.State>> {
  const { replies, castAnalysis } = state;
  console.log(`[ReadRepliesNode] Processing replies.`);
  
  // Parse castAnalysis to extract keywords
  let keywords = {};
  try {
    const parsedCastAnalysis = JSON.parse(castAnalysis);
    keywords = parsedCastAnalysis.keywords || {};
  } catch (error) {
    console.error('[ReadRepliesNode] Error parsing castAnalysis:', error);
  }
  
  const prompt = `
  You are a meticulous linguistic analyst AI agent. Your specific task is to read and analyze a collection of replies from a single user on social media.
  Based on this analysis, you will extract the user's tone, syntax patterns, and identify how they respond to different topics.
  Your analysis must be objective, detailed, and directly derivable from the provided text.

  ### DATA DESCRIPTION ###

  You will be given:
  1. A list of REPLIES from a specific user on Farcaster. Each reply includes the parent post they're replying to and their response.
  2. A list of KEYWORDS/TOPICS identified from the user's main posts to help you categorize their reply patterns.

  Your objective is to understand how the user communicates in conversations, their tone, syntax, and how they respond to different topics.

  ### KEYWORDS/TOPICS ###
  ${JSON.stringify(keywords, null, 2)}

  ### OUTPUT INSTRUCTION ###

  Your output MUST be a single, valid JSON object and nothing else. Do not include any explanatory text, markdown formatting, or apologies. 
  The JSON object must conform to the following structure:

  {{
      "tone": "Concise description of overall tone (e.g., 'Helpful and supportive', 'Direct and matter-of-fact', 'Enthusiastic and encouraging')",
      "syntax": {{
          "sentence_length": "Describe the typical sentence length (e.g., 'Mostly short (5-10 words) to medium-length (10-20 words)')",
          "capitalization": "Describe capitalization habits (e.g., 'Standard sentence case', 'Often uses all lowercase', 'Uses title case for emphasis')",
          "punctuation": "Describe punctuation patterns (e.g., 'Uses exclamation points frequently', 'Minimal punctuation', 'Proper use of commas and periods')",
          "formatting": "Describe formatting choices (e.g., 'Uses line breaks for readability', 'Writes in dense paragraphs', 'Single sentence responses')"
      }},
      "patterns_per_topic": {{
          "topic_key1": "Description of how the user typically responds to this topic",
          "topic_key2": "Description of how the user typically responds to this topic"
      }}
  }}

  ### FIELD DESCRIPTIONS ###

  - **tone**: Overall emotional and attitudinal quality of the user's replies
  - **syntax**: Structural patterns in how the user writes (sentence construction, capitalization, punctuation, formatting)
  - **patterns_per_topic**: For each topic from the keywords, describe how the user typically responds (e.g., "Asks follow-up questions", "Provides detailed technical explanations", "Shares personal experiences")

  ### EXAMPLE ###

  KEYWORDS/TOPICS:
  {{
      "ai_ml": "Discussions about AI/ML models",
      "web3": "Topics related to blockchain and decentralized tech"
  }}

  INPUT REPLIES:
    [
    {{"parentText": "What do you think about the new GPT model?", "text": "honestly it's pretty impressive! the reasoning capabilities are way better than before"}},
    {{"parentText": "Anyone building on Base?", "text": "yeah! been working on a decentralized social app. happy to share what i've learned"}},
    {{"parentText": "How do you handle rate limiting with OpenAI?", "text": "i use exponential backoff with jitter. works really well. here's a quick example..."}}
    ]

  EXPECTED OUTPUT:
  {{
      "tone": "Enthusiastic and helpful. Eager to share knowledge and collaborate with others. Generally positive and encouraging.",
      "syntax": {{
          "sentence_length": "Short to medium-length sentences. Concise and easy to read.",
          "capitalization": "Predominantly lowercase, even at sentence starts. Casual style.",
          "punctuation": "Uses exclamation points to show enthusiasm. Periods for statements. Occasional ellipsis for continuation.",
          "formatting": "Single or double sentences per reply. Sometimes provides code examples or elaborations."
      }},
      "patterns_per_topic": {{
          "ai_ml": "Responds with enthusiasm and provides specific observations about capabilities and improvements. Tends to give honest assessments.",
          "web3": "Offers to help and share experiences. Takes a collaborative approach, willing to provide examples and guidance."
      }}
  }}

  ### USER REPLIES ###
  ${replies}
  `;

  try {
    const response = await llm.invoke([new HumanMessage(prompt)]);
    const responseText = response.content.toString();
    
    // Try to extract JSON from the response
    let extractedJSON = extractJSON(responseText);
    
    if (extractedJSON) {
      console.log('[ReadRepliesNode] Successfully extracted JSON from first attempt.');
      return {
        replyAnalysis: extractedJSON
      };
    }
    
    // First attempt failed, retry with more explicit prompt
    console.log('[ReadRepliesNode] JSON extraction failed. Retrying with more explicit prompt...');
    const retryPrompt = `${prompt}
    
      IMPORTANT: Your previous response could not be parsed as valid JSON. Please respond with ONLY a valid JSON object, with no markdown formatting, no code blocks, no explanations, and no additional text. Start your response with { and end with }.`;
    
    try {
      const retryResponse = await llm.invoke([new HumanMessage(retryPrompt)]);
      const retryResponseText = retryResponse.content.toString();
      
      extractedJSON = extractJSON(retryResponseText);
      
      if (extractedJSON) {
        console.log('[ReadRepliesNode] Successfully extracted JSON from retry attempt.');
        return {
          replyAnalysis: extractedJSON
        };
      }
      
      // Both attempts failed, fall back to original response
      console.log('[ReadRepliesNode] JSON extraction failed on retry. Using standard response.');
      return {
        replyAnalysis: responseText
      };
    } catch (retryError) {
      console.error('[ReadRepliesNode] Error on retry attempt:', retryError);
      // If retry fails, return the original response
      return {
        replyAnalysis: responseText
      };
    }
  } catch (error) {
    console.error('[ReadRepliesNode] Error generating answer:', error);
    return {
      replyAnalysis: "I'm sorry, I couldn't process your request right now."
    };
  }
}

// Constructor Node - Merges castAnalysis and replyAnalysis into final response
async function constructorNode(state: typeof InitAgentState.State): Promise<Partial<typeof InitAgentState.State>> {
  const { castAnalysis, replyAnalysis } = state;
  console.log(`[ConstructorNode] Merging analysis results.`);
  
  try {
    // Parse both JSON strings
    const castData = JSON.parse(castAnalysis);
    const replyData = JSON.parse(replyAnalysis);
    
    // Merge into a single object with all keys
    const mergedData = {
      vocabulary: castData.vocabulary,
      keywords: castData.keywords,
      tone: replyData.tone,
      syntax: replyData.syntax,
      patterns_per_topic: replyData.patterns_per_topic
    };
    
    console.log('[ConstructorNode] Successfully merged analysis results.');
    return {
      response: JSON.stringify(mergedData, null, 2)
    };
  } catch (error) {
    console.error('[ConstructorNode] Error merging analysis:', error);
    // If parsing fails, return both analyses separately
    return {
      response: JSON.stringify({
        castAnalysis: castAnalysis,
        replyAnalysis: replyAnalysis,
        error: "Could not merge analyses"
      }, null, 2)
    };
  }
}

// Create the three-node LangGraph workflow
function createInitAgentGraph() {
  const workflow = new StateGraph(InitAgentState)
    .addNode("readCast", readCastNode)
    .addNode("readReplies", readRepliesNode)
    .addNode("merge", constructorNode)
    .addEdge(START, "readCast")
    .addEdge("readCast", "readReplies")
    .addEdge("readReplies", "merge")
    .addEdge("merge", END);

	return workflow.compile();
}

// Main agent function that uses LangGraph
export async function runInitAgent(
  casts: string,
  replies: string,
  creatorFid: number,
  apiType: 'init' | 'reinit',
  options?: { isFilePath?: boolean }
): Promise<{
    response: string;
  }> {
    console.log(`[InitAgent] Starting agent...`);
    
    const langfuseHandler = new CallbackHandler({
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
      });

    try {
      // Pre-process if inputs are file paths
      let processedCasts = casts;
      let processedReplies = replies;
      
      if (options?.isFilePath) {
        console.log(`[InitAgent] Pre-processing casts file: ${casts}`);
        processedCasts = preprocessCastsFile(casts);
        
        console.log(`[InitAgent] Pre-processing replies file: ${replies}`);
        processedReplies = preprocessRepliesFile(replies);
      }
      
      console.log(`[InitAgent] Processing casts with ${processedCasts.length} characters`);
      console.log(`[InitAgent] Processing replies with ${processedReplies.length} characters`);
      
      // Create the graph
      const graph = createInitAgentGraph();
      
      // Run the graph 
      const result = await graph.invoke({
        casts: processedCasts,
        replies: processedReplies
      }, { 
        callbacks: [langfuseHandler], 
        metadata: { 
          langfuseSessionId: `xbtify-${creatorFid}`,
          apiType: apiType
        } 
      });
      
      return {
        response: result.response || '',
      };
    } catch (error) {
      console.error('[InitAgent] Error running init agent:', error);
      return {
        response: "I'm sorry, there was an error processing your request. Please try again.",
      };
    } finally {
      // Add this line to flush pending Langfuse operations
      try {
        await langfuseHandler.shutdownAsync();
      } catch (error) {
        console.error('[InitAgent] Error shutting down Langfuse:', error);
      }
    }
  }
