import { StateGraph, START, END } from '@langchain/langgraph';
import { extractJSON } from './utils.js';
import { AssistantAgentState, llm } from './langgraph.js';
import { CallbackHandler } from "langfuse-langchain";
import { HumanMessage } from '@langchain/core/messages';

// DecideIfReply Node - Determines if a reply is needed
async function decideIfReplyNode(state: typeof AssistantAgentState.State): Promise<Partial<typeof AssistantAgentState.State>> {
  const { question, conversation, agentUsername } = state;
  console.log(`[DecideIfReplyNode] Evaluating if reply is needed for question: ${question}`);
  
  // Derive creator username by removing last 3 characters from agent username
  const creatorUsername = agentUsername.slice(0, -3);
  
  // Format conversation for the prompt
  const conversationText = Object.entries(conversation || {})
    .map(([key, value]) => `[${key}]: ${value}`)
    .join('\n\n');
  
  const prompt = `
  You are a conversation analyzer that determines whether a meaningful reply is needed.
  
  ### CONTEXT ###
  
  You are an AI assistant for @${creatorUsername}. Your role is to respond on behalf of this user, mimicking their style and knowledge.
  The assistant posts as @${agentUsername} (agent account).
  Given this context, you need to decide if a reply from @${agentUsername} (on behalf of @${creatorUsername}) would be appropriate and meaningful.
  
  ### YOUR TASK ###
  
  Analyze the question and conversation history to decide if the assistant (acting as @${creatorUsername}, posting as @${agentUsername}) should respond.
  
  ### DECISION CRITERIA ###
  
  Reply is NOT needed (decision: "no") when:
  1. The question has already been answered in the conversation by the assistant
  2. The question is not directed at @${creatorUsername} and doesn't require their input
  3. If the question is a social comment, and the assistant has already contributed meaningfully to the conversation with some reply.
  
  Reply IS needed (decision: "yes") when:
  1. If the conversation is not available.
  1. This is a new question that hasn't been addressed by the assistant yet in the conversation.
  2. The question asks for clarification or additional information from @${creatorUsername} and seeks their expertise.
  3. The question introduces a new topic or angle that requires the assistant's reply.
  4. If the question is only a social comment, and the assistant has not yet contributed meaningfully to the conversation with some reply.
  
  
  ### OUTPUT FORMAT ###
  
  Your response MUST be a valid JSON object with "decision" and "reasoning" fields.
  The "decision" field should contain either "yes" or "no".
  The "reasoning" field should briefly explain why this decision was made (1-2 sentences).
  Do not include any explanatory text, markdown formatting, or additional commentary outside the JSON.
  
  Example format:
  {
    "decision": "yes",
    "reasoning": "This is a new question that hasn't been addressed in the conversation yet."
  }
  
  ### CONVERSATION HISTORY ###
  
  ${conversationText || 'No conversation history available.'}
  
  ### CURRENT QUESTION ###
  
  ${question}
  
  Remember: Be strict about avoiding redundant responses. If the question is clearly answered, return "no". Consider whether @${creatorUsername}'s input would add value to the conversation.
  `;

  try {
    const response = await llm.invoke([new HumanMessage(prompt)]);
    const responseText = response.content.toString();
    
    // Try to extract JSON from the response
    let extractedJSON = extractJSON(responseText);
    
    if (extractedJSON) {
      console.log('[DecideIfReplyNode] Successfully extracted JSON from first attempt.');
      const parsed = JSON.parse(extractedJSON);
      const decision = parsed.decision?.toLowerCase() === 'yes';
      const reasoning = parsed.reasoning || 'No reasoning provided';
      console.log('[DecideIfReplyNode] Decision:', decision ? 'Reply needed' : 'No reply needed');
      console.log('[DecideIfReplyNode] Reasoning:', reasoning);
      return {
        to_reply: decision
      };
    }
    
    // First attempt failed, retry with more explicit prompt
    console.log('[DecideIfReplyNode] JSON extraction failed. Retrying with more explicit prompt...');
    const retryPrompt = `${prompt}
    
    IMPORTANT: Your previous response could not be parsed as valid JSON. Please respond with ONLY a valid JSON object with "decision" and "reasoning" fields, with no markdown formatting, no code blocks, no explanations, and no additional text. Start your response with { and end with }.`;
    
    try {
      const retryResponse = await llm.invoke([new HumanMessage(retryPrompt)]);
      const retryResponseText = retryResponse.content.toString();
      
      extractedJSON = extractJSON(retryResponseText);
      
      if (extractedJSON) {
        console.log('[DecideIfReplyNode] Successfully extracted JSON from retry attempt.');
        const parsed = JSON.parse(extractedJSON);
        const decision = parsed.decision?.toLowerCase() === 'yes';
        const reasoning = parsed.reasoning || 'No reasoning provided';
        console.log('[DecideIfReplyNode] Decision:', decision ? 'Reply needed' : 'No reply needed');
        console.log('[DecideIfReplyNode] Reasoning:', reasoning);
        return {
          to_reply: decision
        };
      }
      
      // Both attempts failed, default to replying (safer option)
      console.log('[DecideIfReplyNode] JSON extraction failed on retry. Defaulting to reply.');
      return {
        to_reply: true
      };
    } catch (retryError) {
      console.error('[DecideIfReplyNode] Error on retry attempt:', retryError);
      return {
        to_reply: true
      };
    }
  } catch (error) {
    console.error('[DecideIfReplyNode] Error evaluating reply decision:', error);
    return {
      to_reply: true
    };
  }
}

// AnswerQuestion Node - Generates styled answer based on style profile
async function answerQuestionNode(state: typeof AssistantAgentState.State): Promise<Partial<typeof AssistantAgentState.State>> {
  const { styleProfile, question, context, agentUsername} = state;
  console.log(`[AnswerQuestionNode] Processing question: ${question}`);

  const creatorUsername = agentUsername.slice(0, -3);
  
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
  12. **Keep it short, but with EXCEPTIONS**: If the question is asking for an explanation, and you have information in the context, you can use the context to answer the question.
  13. **NEVER REPEAT THE QUESTION IN THE ANSWER**: The answer should never repeat only the question. Add a comment using user style if you don't know how to answer.
  14. **Never mention creator username (${creatorUsername}) or agent username (${agentUsername}) in the answer**: Never mention the creator username or agent username in the answer.
  
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

  ${context?.text || 'No specific context available.'}

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
      console.log('[AnswerQuestionNode] Generated answer:', extractedJSON);
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
        console.log('[AnswerQuestionNode] Generated answer:', extractedJSON);
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

// StyleRefiner Node - Cleans up GPT-generated artifacts
async function styleRefinerNode(state: typeof AssistantAgentState.State): Promise<Partial<typeof AssistantAgentState.State>> {
  const { response, agentUsername } = state;

  const creatorUsername = agentUsername.slice(0, -3);
  console.log(`[StyleRefinerNode] Refining answer style`);
  
  // Parse the current response to get the text
  let currentText = '';
  try {
    const parsedResponse = JSON.parse(response);
    currentText = parsedResponse.text || '';
  } catch (error) {
    console.error('[StyleRefinerNode] Error parsing response:', error);
    currentText = response;
  }
  
  const prompt = `
  You are a style editor that removes artificial intelligence artifacts from text to make it sound more human and natural.
  
  ### YOUR TASK ###
  
  Clean up the following text by removing common GPT-generated patterns while preserving the core message and tone.
  
  ### CRITICAL: PRESERVE THE SYNTAX ###
  
  The text's syntax (capitalization, punctuation style, sentence structure) has been carefully fitted to match a specific user's style.
  DO NOT change the syntax - keep capitalization, punctuation, and formatting almost identical.
  ONLY focus on removing obvious artificial/GPT-generated elements.
  
  ### WHAT TO REMOVE/FIX ###
  
  1. **Excessive emojis**: Remove overuse of emojis (keep max 1-2 if they fit naturally)
  2. **"-" connectors**: Replace "-" phrase connectors with more natural punctuation (but keep the overall punctuation style)
  3. **Bullet points or numbered lists**: Convert to natural flowing text unless the original style uses them
  4. **Final conclusions**: Remove the conclusion if it's unrelated with the rest of the text. Remove any questions or final words that are clearly artificial.
  5. **Question and answers has to be different**: If the answer is just copy-pasting the question, change the answer to be different.
  6. **Never mention creator username (${creatorUsername}) or agent username (${agentUsername}) in the answer**.
  
  ### WHAT TO PRESERVE ###
  
  1. The core message and meaning
  2. The original tone and personality
  3. **The user's syntax patterns** (capitalization, punctuation style, sentence length)
  4. Natural emojis that fit the context (1-2 max)
  5. Casual language and slang
  6. The conciseness of the answer
  
  ### OUTPUT FORMAT ###
  
  Your response MUST be a valid JSON object with a single "text" field containing the refined answer.
  Do not include any explanatory text, markdown formatting, or additional commentary outside the JSON.
  
  Example format:
  {
    "text": "your refined answer here"
  }
  
  ### TEXT TO REFINE ###
  
  ${currentText}
  
  Remember: Make it sound more human and natural while keeping the essence intact.
  `;

  try {
    const response = await llm.invoke([new HumanMessage(prompt)]);
    const responseText = response.content.toString();
    
    // Try to extract JSON from the response
    let extractedJSON = extractJSON(responseText);
    
    if (extractedJSON) {
      console.log('[StyleRefinerNode] Successfully extracted JSON from first attempt.');
      console.log('[StyleRefinerNode] Refined answer:', extractedJSON);
      return {
        response: extractedJSON
      };
    }
    
    // First attempt failed, retry with more explicit prompt
    console.log('[StyleRefinerNode] JSON extraction failed. Retrying with more explicit prompt...');
    const retryPrompt = `${prompt}
    
    IMPORTANT: Your previous response could not be parsed as valid JSON. Please respond with ONLY a valid JSON object with a "text" field, with no markdown formatting, no code blocks, no explanations, and no additional text. Start your response with { and end with }.`;
    
    try {
      const retryResponse = await llm.invoke([new HumanMessage(retryPrompt)]);
      const retryResponseText = retryResponse.content.toString();
      
      extractedJSON = extractJSON(retryResponseText);
      
      if (extractedJSON) {
        console.log('[StyleRefinerNode] Successfully extracted JSON from retry attempt.');
        console.log('[StyleRefinerNode] Refined answer:', extractedJSON);
        return {
          response: extractedJSON
        };
      }
      
      // Both attempts failed, create a fallback JSON response
      console.log('[StyleRefinerNode] JSON extraction failed on retry. Creating fallback response.');
      return {
        response: JSON.stringify({ text: retryResponseText })
      };
    } catch (retryError) {
      console.error('[StyleRefinerNode] Error on retry attempt:', retryError);
      // If retry fails, return the original response
      return {
        response: JSON.stringify({ text: currentText })
      };
    }
  } catch (error) {
    console.error('[StyleRefinerNode] Error refining style:', error);
    // Return original response on error
    return {
      response: JSON.stringify({ text: currentText })
    };
  }
}

// DecideIfDumb Node - Determines if the question is a simple social comment
async function decideIfDumbNode(state: typeof AssistantAgentState.State): Promise<Partial<typeof AssistantAgentState.State>> {
  const { question, conversation } = state;
  console.log(`[DecideIfDumbNode] Evaluating if question is a simple social comment`);
  
  // Format conversation for the prompt
  const conversationText = Object.entries(conversation || {})
    .map(([key, value]) => `[${key}]: ${value}`)
    .join('\n');
  
  const prompt = `
  You are a question classifier that determines whether a question is a simple social comment or a meaningful question.
  
  ### YOUR TASK ###
  
  Analyze the question to decide if it's just a simple social comment or greeting, or if it's a meaningful question that requires substantial analysis.
  
  ### DECISION CRITERIA ###
  
  Simple social comment (decision: "yes") when the question is:
  1. A greeting (e.g., "hi", "hello", "gm", "good morning", etc.)
  2. A joke, pun, meme reference, or other casual banter that is not requesting information
  3. Congratulations, praise, or compliments (e.g., "good job!", "well done!", "congrats!", "awesome!", "you're great!")
  4. Simple acknowledgments, agreements, or affirmations (e.g., "thanks", "okay", "sure", "cool")
  5. Brief reactions and expressions (e.g., "lol", "haha", "nice")
  6. Any message that is merely a positive, neutral, or supportive reaction without meaningful new content or information
  
  Meaningful question (decision: "no") when the question:
  1. Asks for specific information or explanation
  2. Requires analysis or reasoning
  3. Requests opinions or detailed thoughts
  4. Involves technical or substantive content
  5. Needs external context to answer properly
  
  ### OUTPUT FORMAT ###
  
  Your response MUST be a valid JSON object with "decision" and "reasoning" fields.
  The "decision" field should contain either "yes" or "no".
  "yes" means the question is a simple social comment, "no" means the question is a meaningful question.
  The "reasoning" field should briefly explain why this classification was made (1-2 sentences).
  Do not include any explanatory text, markdown formatting, or additional commentary outside the JSON.
  
  Example format:
  {
    "decision": "no",
    "reasoning": "This question asks for specific technical information and requires substantial analysis."
  }
  
  ### CONVERSATION HISTORY ###
  
  ${conversationText || 'No conversation history available.'}
  
  ### QUESTION ###
  
  ${question}
  
  Remember: Only classify as "yes" (simple social comment) if the question truly requires no substantial analysis or information.
  `;

  try {
    const response = await llm.invoke([new HumanMessage(prompt)]);
    const responseText = response.content.toString();
    
    // Try to extract JSON from the response
    let extractedJSON = extractJSON(responseText);
    
    if (extractedJSON) {
      console.log('[DecideIfDumbNode] Successfully extracted JSON from first attempt.');
      const parsed = JSON.parse(extractedJSON);
      const decision = parsed.decision?.toLowerCase() === 'yes';
      const reasoning = parsed.reasoning || 'No reasoning provided';
      console.log('[DecideIfDumbNode] Decision:', decision ? 'Simple social comment' : 'Meaningful question');
      console.log('[DecideIfDumbNode] Reasoning:', reasoning);
      return {
        is_dumb: decision
      };
    }
    
    // First attempt failed, retry with more explicit prompt
    console.log('[DecideIfDumbNode] JSON extraction failed. Retrying with more explicit prompt...');
    const retryPrompt = `${prompt}
    
    IMPORTANT: Your previous response could not be parsed as valid JSON. Please respond with ONLY a valid JSON object with "decision" and "reasoning" fields, with no markdown formatting, no code blocks, no explanations, and no additional text. Start your response with { and end with }.`;
    
    try {
      const retryResponse = await llm.invoke([new HumanMessage(retryPrompt)]);
      const retryResponseText = retryResponse.content.toString();
      
      extractedJSON = extractJSON(retryResponseText);
      
      if (extractedJSON) {
        console.log('[DecideIfDumbNode] Successfully extracted JSON from retry attempt.');
        const parsed = JSON.parse(extractedJSON);
        const decision = parsed.decision?.toLowerCase() === 'yes';
        const reasoning = parsed.reasoning || 'No reasoning provided';
        console.log('[DecideIfDumbNode] Decision:', decision ? 'Simple social comment' : 'Meaningful question');
        console.log('[DecideIfDumbNode] Reasoning:', reasoning);
        return {
          is_dumb: decision
        };
      }
      
      // Both attempts failed, default to not simple (safer to do full analysis)
      console.log('[DecideIfDumbNode] JSON extraction failed on retry. Defaulting to meaningful question.');
      return {
        is_dumb: false
      };
    } catch (retryError) {
      console.error('[DecideIfDumbNode] Error on retry attempt:', retryError);
      return {
        is_dumb: false
      };
    }
  } catch (error) {
    console.error('[DecideIfDumbNode] Error evaluating question type:', error);
    return {
      is_dumb: false
    };
  }
}

// ConfidenceScorer Node - Evaluates answer quality and confidence
async function confidenceScorerNode(state: typeof AssistantAgentState.State): Promise<Partial<typeof AssistantAgentState.State>> {
  const { styleProfile, question, response, context } = state;
  console.log(`[ConfidenceScorerNode] Evaluating answer confidence`);
  
  // Parse the current response to get the text
  let answerText = '';
  let keywords = 'No keywords available.';
  try {
    const parsedResponse = JSON.parse(response);
    answerText = parsedResponse.text || '';
  } catch (error) {
    console.error('[ConfidenceScorerNode] Error parsing response:', error);
    answerText = response;
  }

  try {
    const parsedKeywords = JSON.parse(styleProfile);
    keywords = parsedKeywords.keywords || '';
  } catch (error) {
    console.error('[ConfidenceScorerNode] Error parsing styleProfile:', error);
    keywords = 'No keywords available.';
  }
  
  const prompt = `
  You are an answer quality evaluator. Your task is to assess how well an answer is grounded in the provided context.
  
  ### YOUR TASK ###
  
  Evaluate the following answer and provide a confidence score with reasoning.
  
  ### PRIMARY EVALUATION CRITERION: CONTEXT USAGE ###
  
  The confidence score should primarily reflect whether the answer uses information from the provided context.
  Even if the answer seems correct or reasonable, if it doesn't use context information, the score should be LOW.
  
  ### EVALUATION CRITERIA ###
  
  Consider these factors when scoring:
  
  **High Confidence:**
  - The topic of the question is very related to the main topics
  - Answer uses specific information, facts, or details from the provided context topics

  **Medium Confidence:**
  - The topic of the question is somewhat related to the main topics
  - Answer partially uses context information but also includes general knowledge

  
  **Low Confidence:**
  - The topic of the question is not related to the main topics
  - Answer does NOT use any information from the provided context
 

  ### OUTPUT FORMAT ###
  
  Your response MUST be a valid JSON object with "score" and "reasoning" fields.
  The "score" field must be EXACTLY one of: "high", "medium", or "low" (lowercase).
  Do not include any explanatory text, markdown formatting, or additional commentary outside the JSON.
  
  Example format:
  {
    "score": "high",
    "reasoning": "Answer directly addresses the question with specific information from context."
  }
  
  ### QUESTION ###
  
  ${question}

  ### AVAILABLE MAIN TOPICS ###

  ${keywords}
  
  ### AVAILABLE CONTEXT ###
  
  ${context?.text || 'No specific context available.'}
  
  ### GENERATED ANSWER ###
  
  ${answerText}
  
  Remember: 
  - Focus primarily on whether the answer uses information from the context
  - Be objective and concise in your evaluation
  - The reasoning should be 1-2 sentences maximum
  - Explain whether and how the answer is grounded in the provided context
  `;

  try {
    const response = await llm.invoke([new HumanMessage(prompt)]);
    const responseText = response.content.toString();
    
    // Try to extract JSON from the response
    let extractedJSON = extractJSON(responseText);
    
    if (extractedJSON) {
      console.log('[ConfidenceScorerNode] Successfully extracted JSON from first attempt.');
      const parsed = JSON.parse(extractedJSON);
      const score = parsed.score || 'medium';
      console.log('[ConfidenceScorerNode] Confidence Score:', score);
      console.log('[ConfidenceScorerNode] Reasoning:', parsed.reasoning || 'Unable to evaluate confidence.');
      return {
        scoreConfidence: score,
        reasoningConfidence: parsed.reasoning || 'Unable to evaluate confidence.'
      };
    }
    
    // First attempt failed, retry with more explicit prompt
    console.log('[ConfidenceScorerNode] JSON extraction failed. Retrying with more explicit prompt...');
    const retryPrompt = `${prompt}
    
    IMPORTANT: Your previous response could not be parsed as valid JSON. Please respond with ONLY a valid JSON object with "score" (string: "high", "medium", or "low") and "reasoning" (string) fields, with no markdown formatting, no code blocks, no explanations, and no additional text. Start your response with { and end with }.`;
    
    try {
      const retryResponse = await llm.invoke([new HumanMessage(retryPrompt)]);
      const retryResponseText = retryResponse.content.toString();
      
      extractedJSON = extractJSON(retryResponseText);
      
      if (extractedJSON) {
        console.log('[ConfidenceScorerNode] Successfully extracted JSON from retry attempt.');
        const parsed = JSON.parse(extractedJSON);
        const score = parsed.score || 'medium';
        console.log('[ConfidenceScorerNode] Confidence Score:', score);
        console.log('[ConfidenceScorerNode] Reasoning:', parsed.reasoning || 'Unable to evaluate confidence.');
        return {
          scoreConfidence: score,
          reasoningConfidence: parsed.reasoning || 'Unable to evaluate confidence.'
        };
      }
      
      // Both attempts failed, return default values
      console.log('[ConfidenceScorerNode] JSON extraction failed on retry. Using default values.');
      return {
        scoreConfidence: undefined,
        reasoningConfidence: undefined
      };
    } catch (retryError) {
      console.error('[ConfidenceScorerNode] Error on retry attempt:', retryError);
      return {
        scoreConfidence: undefined,
        reasoningConfidence: undefined
      };
    }
  } catch (error) {
    console.error('[ConfidenceScorerNode] Error evaluating confidence:', error);
    return {
      scoreConfidence: undefined,
      reasoningConfidence: undefined
    };
  }
}

// LowConfidenceFallback Node - Provides predefined fallback responses for low-confidence answers
async function lowConfidenceFallbackNode(state: typeof AssistantAgentState.State): Promise<Partial<typeof AssistantAgentState.State>> {
  const { question, conversation, styleProfile, scoreConfidence } = state;
  console.log(`[LowConfidenceFallbackNode] Evaluating fallback for score: ${scoreConfidence}`);
  
  // Only process if score is "low"
  if (scoreConfidence !== 'low') {
    console.log('[LowConfidenceFallbackNode] Score is not low, no fallback needed.');
    return {};
  }
  
  // Format conversation for the prompt
  const conversationText = Object.entries(conversation || {})
    .map(([key, value]) => `[${key}]: ${value}`)
    .join('\n');
  
  const prompt = `
  You are a style adapter. The assistant's answer had low confidence, so you need to provide a fallback response.
  
  ### YOUR TASK ###
  
  Adapt the following predefined fallback message to match the user's communication style perfectly.
  
  ### PREDEFINED FALLBACK MESSAGE ###
  
  "I'm not confident enough to answer this properly, you might want to ask someone more knowledgeable or just Google/GPT it."
  
  ### STYLE ADAPTATION ###
  
  Transform the predefined message to sound EXACTLY like the user would say it based on their style profile:
  - Use their typical vocabulary, tone, and syntax
  - Match their punctuation and capitalization patterns
  - Keep the core meaning (expressing uncertainty and suggesting alternative sources)
  - Make it concise and natural to their communication style
  
  ### OUTPUT FORMAT ###
  
  Your response MUST be a valid JSON object with a "text" field containing the adapted fallback response.
  Do not include any explanatory text, markdown formatting, or additional commentary outside the JSON.
  
  Example format:
  {
    "text": "your adapted fallback response here"
  }
  
  ### STYLE PROFILE ###
  
  ${styleProfile}
  
  ### CONVERSATION HISTORY ###
  
  ${conversationText || 'No conversation history available.'}
  
  ### QUESTION ###
  
  ${question}
  
  Remember: The adapted response should sound completely natural and authentic to the user's voice.
  `;

  try {
    const response = await llm.invoke([new HumanMessage(prompt)]);
    const responseText = response.content.toString();
    
    // Try to extract JSON from the response
    let extractedJSON = extractJSON(responseText);
    
    if (extractedJSON) {
      console.log('[LowConfidenceFallbackNode] Successfully extracted JSON from first attempt.');
      console.log('[LowConfidenceFallbackNode] Fallback response:', extractedJSON);
      return {
        response: extractedJSON
      };
    }
    
    // First attempt failed, retry with more explicit prompt
    console.log('[LowConfidenceFallbackNode] JSON extraction failed. Retrying with more explicit prompt...');
    const retryPrompt = `${prompt}
    
    IMPORTANT: Your previous response could not be parsed as valid JSON. Please respond with ONLY a valid JSON object with a "text" field, with no markdown formatting, no code blocks, no explanations, and no additional text. Start your response with { and end with }.`;
    
    try {
      const retryResponse = await llm.invoke([new HumanMessage(retryPrompt)]);
      const retryResponseText = retryResponse.content.toString();
      
      extractedJSON = extractJSON(retryResponseText);
      
      if (extractedJSON) {
        console.log('[LowConfidenceFallbackNode] Successfully extracted JSON from retry attempt.');
        console.log('[LowConfidenceFallbackNode] Fallback response:', extractedJSON);
        return {
          response: extractedJSON
        };
      }
      
      // Both attempts failed, use default fallback
      console.log('[LowConfidenceFallbackNode] JSON extraction failed on retry. Using default fallback.');
      return {
        response: JSON.stringify({ text: "I'm not confident enough to answer this properly - you might want to ask someone more knowledgeable or just Google/GPT it." })
      };
    } catch (retryError) {
      console.error('[LowConfidenceFallbackNode] Error on retry attempt:', retryError);
      return {
        response: JSON.stringify({ text: "I'm not confident enough to answer this properly - you might want to ask someone more knowledgeable or just Google/GPT it." })
      };
    }
  } catch (error) {
    console.error('[LowConfidenceFallbackNode] Error generating fallback:', error);
    return {
      response: JSON.stringify({ text: "I'm not confident enough to answer this properly - you might want to ask someone more knowledgeable or just Google/GPT it." })
    };
  }
}

// Create the multi-node Assistant workflow
function createAssistantGraph() {
  const workflow = new StateGraph(AssistantAgentState)
    .addNode("decideIfReply", decideIfReplyNode)
    .addNode("answerQuestion", answerQuestionNode)
    .addNode("styleRefiner", styleRefinerNode)
    .addNode("decideIfDumb", decideIfDumbNode)
    .addNode("confidenceScorer", confidenceScorerNode)
    .addNode("lowConfidenceFallback", lowConfidenceFallbackNode)
    .addEdge(START, "decideIfReply")
    .addConditionalEdges(
      "decideIfReply",
      (state) => {
        // If to_reply is false, end the workflow
        // If to_reply is true, continue to answerQuestion
        return state.to_reply ? "answerQuestion" : END;
      }
    )
    .addEdge("answerQuestion", "styleRefiner")
    .addEdge("styleRefiner", "decideIfDumb")
    .addConditionalEdges(
      "decideIfDumb",
      (state) => {
        // If is_dumb is true (simple social comment), end the workflow
        // If is_dumb is false (meaningful question), continue to confidenceScorer
        return state.is_dumb ? END : "confidenceScorer";
      }
    )
    .addEdge("confidenceScorer", "lowConfidenceFallback")
    .addEdge("lowConfidenceFallback", END);

  return workflow.compile();
}

// Main assistant function that uses LangGraph
export async function runAssistant(
  styleProfile: string,
  question: string,
  creatorFid: number,
  agentUsername: string,
  conversation: Record<string, string>,
  context?: { text: string }
): Promise<{
  response: string;
  score_confidence: string | null;
  reasoning_confidence: string | null;
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
      conversation: conversation,
      agentUsername: agentUsername,
      context: context || { text: '' }
    }, { 
      callbacks: [langfuseHandler], 
      metadata: { 
        langfuseSessionId: `xbtify-${creatorFid}`,
        apiType: 'ask'
      } 
    });
    
    // Handle early exit when no reply is needed
    if (result.to_reply === false) {
      console.log('[Assistant] No reply needed based on conversation analysis.');
      return {
        response: "No reply needed",
        score_confidence: null,
        reasoning_confidence: null,
      };
    }
    
    // Handle early exit when question is a simple social comment
    if (result.is_dumb === true) {
      console.log('[Assistant] Question is a simple social comment, returning without confidence scoring.');
      return {
        response: result.response || JSON.stringify({ text: '' }),
        score_confidence: null,
        reasoning_confidence: null,
      };
    }
    
    // Normal return with all fields populated
    return {
      response: result.response || JSON.stringify({ text: '' }),
      score_confidence: result.scoreConfidence ?? 'medium',
      reasoning_confidence: result.reasoningConfidence || 'Unable to evaluate confidence.',
    };
  } catch (error) {
    console.error('[Assistant] Error running assistant:', error);
    return {
      response: JSON.stringify({ text: "I'm sorry, there was an error processing your request. Please try again." }),
      score_confidence: 'medium',
      reasoning_confidence: 'Error occurred during processing.',
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

