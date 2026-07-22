/**
 * memory.js — two separate memory stores, one per WhatsApp chat (sessionId):
 *
 *  1. Conversation history  -> InMemoryChatMessageHistory (same as Session 6 FILE 04)
 *  2. Personal facts        -> a plain structured object {name, age, city, ...}
 *
 * Conversation history alone is NOT enough for "what do you know about me?" —
 * an LLM would have to re-read the whole chat every time and might miss or
 * misremember facts. Storing facts separately means we can answer that
 * question instantly and reliably, straight from the store.
 *
 * Both stores are in-memory (plain JS objects/Maps), so they persist for as
 * long as the bot process runs — i.e. for the whole conversation session —
 * but reset if the bot restarts. Swap these for a database in production.
 */

import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";

// ---------- Store 1: conversation history, one per session ----------
const historyStore = {};

export function getSessionHistory(sessionId) {
  if (!historyStore[sessionId]) {
    historyStore[sessionId] = new InMemoryChatMessageHistory();
  }
  return historyStore[sessionId];
}

// ---------- Store 2: personal facts, one object per session ----------
const factsStore = {};

const emptyFacts = () => ({
  name: null,
  age: null,
  city: null,
  profession: null,
  education: null,
  favorite_food: null,
  hobbies: [],       // array field — can hold more than one
  preferences: [],   // array field — likes/dislikes that aren't hobbies or food
  other: {},         // catch-all for any fact that doesn't fit the fields above
});

export function getUserFacts(sessionId) {
  if (!factsStore[sessionId]) {
    factsStore[sessionId] = emptyFacts();
  }
  return factsStore[sessionId];
}

/**
 * Merge newly-extracted facts into the existing store for this session.
 * Scalars (name, age, city, ...) are overwritten only when a new value is
 * actually provided. Arrays (hobbies, preferences) are appended to and
 * de-duplicated instead of overwritten, so earlier facts aren't lost.
 */
export function updateUserFacts(sessionId, newFacts) {
  const current = getUserFacts(sessionId);

  for (const key of ["name", "age", "city", "profession", "education", "favorite_food"]) {
    if (newFacts[key] !== undefined && newFacts[key] !== null && newFacts[key] !== "") {
      current[key] = newFacts[key];
    }
  }

  for (const key of ["hobbies", "preferences"]) {
    const incoming = Array.isArray(newFacts[key]) ? newFacts[key] : [];
    const merged = new Set([...current[key], ...incoming.filter(Boolean)]);
    current[key] = [...merged];
  }

  if (newFacts.other && typeof newFacts.other === "object") {
    current.other = { ...current.other, ...newFacts.other };
  }

  return current;
}

export function hasAnyFacts(sessionId) {
  const f = getUserFacts(sessionId);
  return Boolean(
    f.name || f.age || f.city || f.profession || f.education || f.favorite_food ||
    f.hobbies.length > 0 || f.preferences.length > 0 || Object.keys(f.other).length > 0
  );
}

/** Turn the stored facts into a friendly WhatsApp-ready summary string. */
export function formatUserFacts(sessionId) {
  if (!hasAnyFacts(sessionId)) {
    return "I don't have anything saved about you yet — tell me a bit about yourself! 🙂";
  }

  const f = getUserFacts(sessionId);
  const lines = ["Here's what I know about you so far:"];

  if (f.name) lines.push(`• Name: ${f.name}`);
  if (f.age) lines.push(`• Age: ${f.age}`);
  if (f.city) lines.push(`• City: ${f.city}`);
  if (f.profession) lines.push(`• Profession: ${f.profession}`);
  if (f.education) lines.push(`• Education: ${f.education}`);
  if (f.favorite_food) lines.push(`• Favorite food: ${f.favorite_food}`);
  if (f.hobbies.length) lines.push(`• Hobbies: ${f.hobbies.join(", ")}`);
  if (f.preferences.length) lines.push(`• Preferences: ${f.preferences.join(", ")}`);
  for (const [key, value] of Object.entries(f.other)) {
    lines.push(`• ${key}: ${value}`);
  }

  return lines.join("\n");
}
