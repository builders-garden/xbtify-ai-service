import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { CallbackHandler } from "langfuse-langchain";

// Initialize the LLM with OpenAI
export const llm = new ChatOpenAI({
    model: 'gpt-5-mini',
    // temperature: 0.7, // gpt-5-mini only supports temperature: 1 (default)
    apiKey: process.env.OPENAI_API_KEY,
  });
  
export const langfuseHandler = new CallbackHandler({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
    });
  
// Define the state interface for LangGraph
export const InitAgentState = Annotation.Root({
    casts: Annotation<string>,
    response: Annotation<string>,
  });