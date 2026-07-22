/**
 * chatbot.js — wires everything together into the flow the assignment asks for:
 *
 *   incoming message
 *     -> update conversation history
 *     -> extract personal facts -> update personal-facts memory
 *     -> if the user is asking "what do you know about me?" -> return stored facts
 *     -> else -> retrieve RAG context -> send context + history to Groq -> return answer
 *
 * index.js (Baileys) only ever calls getReply() from this file — it doesn't
 * need to know anything about LangChain, RAG, or memory internals.
 */

import { ChatGroq } from "@langchain/groq";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";

import { ragChatPrompt } from "./prompts.js";
import { retrieveContext, warmUpRag } from "./rag.js";
import { getSessionHistory, updateUserFacts, formatUserFacts } from "./memory.js";
import { extractFacts, isMemoryQuery } from "./extractor.js";

const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile",
  temperature: 0.7,
});

const chain = ragChatPrompt.pipe(model).pipe(new StringOutputParser());

const chatbot = new RunnableWithMessageHistory({
  runnable: chain,
  getMessageHistory: getSessionHistory,
  inputMessagesKey: "message",
  historyMessagesKey: "history",
});

/** Call once at startup so RAG indexing doesn't delay the first WhatsApp reply. */
export function initChatbot() {
  return warmUpRag();
}

/**
 * Turn one incoming WhatsApp message into a reply.
 * sessionId = the sender's WhatsApp number, so each chat gets its own
 * conversation history AND its own personal-facts store.
 */
export async function getReply(text, sessionId) {
  try {
    // 1 & 2: extract any personal facts and fold them into this session's memory
    // (runs on every message — a fact can show up in an otherwise-unrelated message)
    const facts = await extractFacts(text);
    if (Object.keys(facts).length > 0) {
      updateUserFacts(sessionId, facts);
      console.log(`   [memory] stored facts for ${sessionId}:`, facts);
    }

    // 3: "what do you know about me?" -> answer straight from the facts store,
    // no LLM call needed, and it still goes into history so the bot remembers
    // it told the user this.
    if (isMemoryQuery(text)) {
      const summary = formatUserFacts(sessionId);
      const history = getSessionHistory(sessionId);
      await history.addUserMessage(text);
      await history.addAIMessage(summary);
      return summary;
    }

    // 4: normal question -> retrieve RAG context, then let the model answer
    // using that context plus the conversation history.
    const context = await retrieveContext(text);

    return await chatbot.invoke(
      { message: text, context },
      { configurable: { sessionId } }
    );
  } catch (err) {
    console.error("Chatbot error:", err.message);
    return "Sorry, I couldn't think of a reply just now — try again in a moment.";
  }
}
