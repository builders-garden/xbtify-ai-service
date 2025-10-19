import { StateGraph, START, END } from '@langchain/langgraph';
import { extractJSON } from './utils.js';
import { AssistantAgentState, llm } from './langgraph.js';
import { CallbackHandler } from "langfuse-langchain";
import { HumanMessage } from '@langchain/core/messages';

// AnswerQuestion Node - Generates styled answer based on style profile
async function answerQuestionNode(state: typeof AssistantAgentState.State): Promise<Partial<typeof AssistantAgentState.State>> {
  const { styleProfile, question, context } = state;
  console.log(`[AnswerQuestionNode] Processing question: ${question}`);
  
  const prompt = `
  You are an AI assistant that answers questions while mimicking a specific user's communication style.
  You have been provided with a detailed STYLE PROFILE that captures how a particular user communicates.

  ### STYLE PROFILE EXPLANATION ###
  
  The style profile above contains:
  - **vocabulary**: Common phrases, jargon, and filler words the user frequently uses
  - **keywords**: Topics the user discusses, with brief descriptions
  - **tone**: The overall emotional and attitudinal quality of the user's communication
  - **syntax**: Structural patterns including sentence length, capitalization, punctuation, and formatting
  - **patterns_per_topic**: Specific response patterns for each topic the user discusses
    
  
  ### YOUR TASK ###
  
  Answer the following question while perfectly mimicking the user's style:
  
  ### INSTRUCTIONS ###
  
  1. **Identify Topic Match**: Determine if the question relates to any of the keywords/topics in the style profile
  2. **Apply Topic Pattern**: If a matching topic is found, follow the corresponding pattern from "patterns_per_topic"
  3. **Apply Tone**: Use the exact tone described in the profile (e.g., enthusiastic, helpful, direct)
  4. **Apply Syntax**: Match the user's syntax patterns:
     - Use their typical sentence length
     - Follow their capitalization habits
     - Mimic their punctuation style
     - Match their formatting preferences
  5. **Use Vocabulary**: Incorporate the user's common phrases, jargon, and filler words naturally
  6. **Answer with Knowledge**: If the question doesn't match any specific topic, still answer using your general knowledge while maintaining the user's tone and syntax
  7. **Keep it CONCISE and to the point**: The answer should be concise and to the point. Keep it short and sweet.
  8. **Do not ABUSE the vocabulary**: take inspiration from the vocabulary but do not use it verbatim. 
  9. **No greetings if not asked**: Do not say 'gm' or other greetings if there isn't a greeting in the question.
  10. **Answer dummy questions**: if the question is a dummy question, or very short, answer with a very short and dummy answer.
  11. **Can use the context**: if the question is asking for opinions, information, or anything that can be answered with the context, use the context to answer the question.
  
  ### OUTPUT FORMAT ###
  
  Your response MUST be a valid JSON object with a single "text" field containing your styled answer.
  Do not include any explanatory text, markdown formatting, or apologies outside the JSON.
  
  Example format:
  {
    "text": "your styled answer here matching the user's communication style"
  }

  ### STYLE PROFILE ###
  
  ${styleProfile}

  ### RELEVANT CONTEXT FROM USER'S CASTS ###

  ${context || 'No specific context available.'}

  ### QUESTION ###

  ${question}
  
  Remember: The answer should sound EXACTLY like the user wrote it themselves. Keep it CONCISE and to the point.
  `;

  try {
    const response = await llm.invoke([new HumanMessage(prompt)]);
    const responseText = response.content.toString();
    
    // Try to extract JSON from the response
    let extractedJSON = extractJSON(responseText);
    
    if (extractedJSON) {
      console.log('[AnswerQuestionNode] Successfully extracted JSON from first attempt.');
      return {
        response: extractedJSON
      };
    }
    
    // First attempt failed, retry with more explicit prompt
    console.log('[AnswerQuestionNode] JSON extraction failed. Retrying with more explicit prompt...');
    const retryPrompt = `${prompt}
    
    IMPORTANT: Your previous response could not be parsed as valid JSON. Please respond with ONLY a valid JSON object with a "text" field, with no markdown formatting, no code blocks, no explanations, and no additional text. Start your response with { and end with }.`;
    
    try {
      const retryResponse = await llm.invoke([new HumanMessage(retryPrompt)]);
      const retryResponseText = retryResponse.content.toString();
      
      extractedJSON = extractJSON(retryResponseText);
      
      if (extractedJSON) {
        console.log('[AnswerQuestionNode] Successfully extracted JSON from retry attempt.');
        return {
          response: extractedJSON
        };
      }
      
      // Both attempts failed, create a fallback JSON response
      console.log('[AnswerQuestionNode] JSON extraction failed on retry. Creating fallback response.');
      return {
        response: JSON.stringify({ text: retryResponseText })
      };
    } catch (retryError) {
      console.error('[AnswerQuestionNode] Error on retry attempt:', retryError);
      // If retry fails, return the original response wrapped in JSON
      return {
        response: JSON.stringify({ text: responseText })
      };
    }
  } catch (error) {
    console.error('[AnswerQuestionNode] Error generating answer:', error);
    return {
      response: JSON.stringify({ text: "I'm sorry, I couldn't process your request right now." })
    };
  }
}

// Create the single-node Assistant workflow
function createAssistantGraph() {
  const workflow = new StateGraph(AssistantAgentState)
    .addNode("answerQuestion", answerQuestionNode)
    .addEdge(START, "answerQuestion")
    .addEdge("answerQuestion", END);

  return workflow.compile();
}

// Main assistant function that uses LangGraph
export async function runAssistant(
  styleProfile: string,
  question: string,
  context?: string
): Promise<{
  response: string;
}> {
  console.log(`[Assistant] Starting assistant with question: ${question}`);
  
  const langfuseHandler = new CallbackHandler({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
  });

  try {
    // Create the graph
    const graph = createAssistantGraph();
    
    // Run the graph 
    const result = await graph.invoke({
      styleProfile: styleProfile,
      question: question,
      context: context || ''
    }, { callbacks: [langfuseHandler] });
    
    return {
      response: result.response || JSON.stringify({ text: '' }),
    };
  } catch (error) {
    console.error('[Assistant] Error running assistant:', error);
    return {
      response: JSON.stringify({ text: "I'm sorry, there was an error processing your request. Please try again." }),
    };
  } finally {
    // Flush pending Langfuse operations
    try {
      await langfuseHandler.shutdownAsync();
    } catch (error) {
      console.error('[Assistant] Error shutting down Langfuse:', error);
    }
  }
}

