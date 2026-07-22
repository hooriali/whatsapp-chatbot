/**
 * extractor.js — detects personal facts inside a WhatsApp message and asks
 * for a real structured object back, the same way Session 6 FILE 03 used
 * .withStructuredOutput() to turn messy text into a Pydantic-style object
 * (Contact { name, email, phone }) instead of hand-parsing JSON.
 *
 * Every field is optional/nullable because most messages don't contain
 * personal info at all — "null" just means "nothing found," not an error.
 */

import { ChatGroq } from "@langchain/groq";
import { z } from "zod";

const MODEL = "llama-3.3-70b-versatile";

// temperature 0 -> stay precise, this is data extraction, not conversation
const extractorLlm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: MODEL,
  temperature: 0,
});

const PersonalFacts = z.object({
  name: z.string().nullable().describe("the person's name, or null if not mentioned"),
  age: z.string().nullable().describe("the person's age, or null if not mentioned"),
  city: z.string().nullable().describe("the city the person lives in, or null if not mentioned"),
  profession: z.string().nullable().describe("the person's job/profession/field of study, or null if not mentioned"),
  education: z.string().nullable().describe("what/where the person studies or studied, or null if not mentioned"),
  favorite_food: z.string().nullable().describe("the person's favorite food, or null if not mentioned"),
  hobbies: z.array(z.string()).describe("hobbies or activities the person enjoys, empty array if none mentioned"),
  preferences: z.array(z.string()).describe("other likes/dislikes/preferences that aren't hobbies or food, empty array if none mentioned"),
});

const structuredExtractor = extractorLlm.withStructuredOutput(PersonalFacts, {
  name: "extract_personal_facts",
});

/**
 * Look at one incoming message and pull out any personal facts it contains.
 * Returns a plain object with only the fields that were actually found
 * (nulls and empty arrays stripped out), ready to hand to memory.updateUserFacts().
 */
export async function extractFacts(message) {
  try {
    const result = await structuredExtractor.invoke(
      `Extract any personal facts the user shared about themselves from this WhatsApp message. ` +
      `Only extract facts the user states about THEMSELVES, not about other people. ` +
      `If nothing personal is shared, leave every field null/empty.\n\nMessage: "${message}"`
    );

    const facts = {};
    for (const key of ["name", "age", "city", "profession", "education", "favorite_food"]) {
      if (result[key]) facts[key] = result[key];
    }
    if (result.hobbies?.length) facts.hobbies = result.hobbies;
    if (result.preferences?.length) facts.preferences = result.preferences;

    return facts;
  } catch (err) {
    // Extraction is a "nice to have" on every message — never let it break the reply.
    console.error("Fact extraction error:", err.message);
    return {};
  }
}

// ---------- Quick keyword check for "what do you know about me?" style asks ----------
const MEMORY_QUERY_PATTERNS = [
  /what do you know about me/i,
  /who am i/i,
  /what have you (remembered|learned) (about me)?/i,
  /list everything you (know|remember)/i,
  /what do you remember about me/i,
  /tell me (everything|what) you know about me/i,
];

export function isMemoryQuery(text) {
  return MEMORY_QUERY_PATTERNS.some((pattern) => pattern.test(text));
}
