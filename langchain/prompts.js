/**
 * prompts.js — the ChatPromptTemplate + MessagesPlaceholder pattern from
 * Session 6 FILE 04, now including RAG context as an extra blank to fill.
 */

import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

export const ragChatPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a friendly WhatsApp assistant for the AI Season bootcamp.\n" +
      "Use the CONTEXT below if it's relevant to the question — it comes from the bootcamp's " +
      "knowledge base and is more reliable than your own guesses. If the context doesn't cover " +
      "the question, just answer normally from the conversation.\n" +
      "Keep replies short and WhatsApp-friendly (a few sentences, occasional emoji is fine).\n\n" +
      "CONTEXT:\n{context}",
  ],
  new MessagesPlaceholder("history"), // past messages for this chat get inserted here
  ["human", "{message}"],
]);
