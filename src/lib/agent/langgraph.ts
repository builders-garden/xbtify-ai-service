import { Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

// Initialize the LLM with OpenAI
export const llm = new ChatOpenAI({
    model: 'gpt-5-mini',
    // temperature: 0.7, // gpt-5-mini only supports temperature: 1 (default)
    apiKey: process.env.OPENAI_API_KEY,
  });

  
// Define the state interface for LangGraph
export const InitAgentState = Annotation.Root({
    casts: Annotation<string>,
    replies: Annotation<string>,
    castAnalysis: Annotation<string>,
    replyAnalysis: Annotation<string>,
    response: Annotation<string>,
  });

// Define the state interface for Assistant Agent
export const AssistantAgentState = Annotation.Root({
    styleProfile: Annotation<string>,
    question: Annotation<string>,
    context: Annotation<string>,
    response: Annotation<string>,
  });
