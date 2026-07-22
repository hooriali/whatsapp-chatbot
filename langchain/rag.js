/**
 * rag.js — the same retrieve-then-answer idea as Session 6 FILE 06, packaged
 * as a reusable module instead of a one-off script:
 *
 *   TextLoader                  -> read knowledge.txt off disk
 *   RecursiveCharacterTextSplitter -> break it into overlapping chunks
 *   HuggingFaceInferenceEmbeddings -> turn each chunk into a vector
 *   MemoryVectorStore            -> store + search those vectors (no manual cosine similarity)
 *   .asRetriever()                -> ".invoke(question)" -> closest chunks
 *
 * The store is built ONCE when the bot starts (buildRetriever below is
 * cached), not on every incoming message.
 */

import path from "path";
import { fileURLToPath } from "url";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_FILE = path.join(__dirname, "knowledge.txt");

let retrieverPromise = null;

async function buildRetriever() {
  const loader = new TextLoader(KNOWLEDGE_FILE);
  const docs = await loader.load();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 300,
    chunkOverlap: 30,
  });
  const chunks = await splitter.splitDocuments(docs);

  const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACEHUB_API_KEY,
    model: "sentence-transformers/all-MiniLM-L6-v2",
  });

  const vectorstore = await MemoryVectorStore.fromDocuments(chunks, embeddings);
  console.log(`RAG ready: ${chunks.length} knowledge-base chunks embedded and indexed.`);

  return vectorstore.asRetriever({ k: 3 }); // top 3 closest chunks
}

/** Lazily build the retriever once, then reuse it for every call. */
function getRetriever() {
  if (!retrieverPromise) retrieverPromise = buildRetriever();
  return retrieverPromise;
}

/**
 * Retrieve the closest knowledge-base chunks for a question and glue them
 * into a single context string, ready to drop into a prompt.
 */
export async function retrieveContext(question) {
  try {
    const retriever = await getRetriever();
    const docs = await retriever.invoke(question);
    return docs.map((doc) => doc.pageContent).join("\n");
  } catch (err) {
    console.error("RAG retrieval error:", err.message);
    return ""; // fall back to no context rather than crashing the reply
  }
}

/** Call once at startup so the first real WhatsApp message isn't slowed down by indexing. */
export function warmUpRag() {
  return getRetriever();
}
