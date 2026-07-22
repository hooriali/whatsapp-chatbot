/**
 * demo.js — run this locally (with real GROQ_API_KEY + HUGGINGFACEHUB_API_KEY
 * in .env) to generate real, working example conversations for your
 * assignment submission, without needing to scan a WhatsApp QR code.
 *
 * It calls the exact same getReply() function index.js uses for real
 * WhatsApp messages — this just prints the results to the terminal instead
 * of sending them over WhatsApp.
 *
 * Usage:  node demo.js
 */

import "dotenv/config";
import { getReply, initChatbot } from "./langchain/chatbot.js";

const sessionId = "demo-user-923001234567";

const conversation = [
  // --- personal info being stored ---
  "Hi! My name is Alexa.",
  "I'm 21 years old and I live in Karachi.",
  "I study Computer Science and my favorite food is pizza.",
  "I really like football and painting.",

  // --- RAG: answering from the knowledge base ---
  "How are students graded in the bootcamp?",
  "When are the instructor's office hours?",
  "What happens if I submit an assignment late?",

  // --- memory retrieval ---
  "What do you know about me?",
];

async function run() {
  console.log("Indexing knowledge base...");
  await initChatbot();
  console.log("\n=== DEMO CONVERSATION ===\n");

  for (const message of conversation) {
    console.log(`User: ${message}`);
    const reply = await getReply(message, sessionId);
    console.log(`Bot:  ${reply}\n`);
  }
}

run();
