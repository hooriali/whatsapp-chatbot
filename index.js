/**
 * WhatsApp Bot — Baileys + LangChain (RAG + Memory) + Groq
 * ============================================================
 * This file is now Baileys-only: connect to WhatsApp, receive messages,
 * send replies. All LangChain logic (RAG, conversation memory, personal
 * facts, prompts) lives in ./langchain/ — see langchain/chatbot.js for
 * the orchestration.
 */

import "dotenv/config";
import pino from "pino"; // logging library used by Baileys
import QRCode from "qrcode"; // generates a terminal QR code for WhatsApp pairing

import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
  DisconnectReason,
} from "baileys";

import { getReply, initChatbot } from "./langchain/chatbot.js";

// ---------- Baileys connection ----------
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  // NOTE: fetchLatestBaileysVersion() ships a stale protocol version in
  // 7.0.0-rc13 that blocks pairing. fetchLatestWaWebVersion() is the fix.
  const { version } = await fetchLatestWaWebVersion();

  const sock = makeWASocket({
    auth: state,
    version,
    logger: pino({ level: "silent" }), // Baileys' own protocol logs are very noisy — silence them
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("Scan this QR code with WhatsApp (Settings > Linked Devices > Link a Device):");
      console.log(await QRCode.toString(qr, { type: "terminal", small: true }));
    }

    if (connection === "open") {
      console.log("Connected! The bot is now live on WhatsApp.");
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      console.log(
        "Connection closed.",
        loggedOut
          ? "Logged out — delete auth_info_baileys/ and restart to scan a new QR."
          : "Reconnecting..."
      );
      if (!loggedOut) startBot();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      const jid = msg.key.remoteJid;
      const isGroup = jid?.endsWith("@g.us");
      const isStatus = jid === "status@broadcast";
      if (msg.key.fromMe || isGroup || isStatus) continue; // skip our own messages, groups, and status updates

      // remoteJid is a @lid (WhatsApp's privacy ID) when linked; remoteJidAlt carries the real phone number
      const number = (msg.key.remoteJidAlt || jid)?.split("@")[0];
      console.log(`Message from: ${number}`);

      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
      if (!text) continue; // skip images/stickers/etc — text only for this demo

      console.log(`[${jid}] ${text}`);
      const reply = await getReply(text, number); // number = session_id -> one memory per chat
      await sock.sendMessage(jid, { text: reply });
    }
  });
}

// Build the RAG index once at startup so the first message isn't slow.
console.log("Indexing knowledge base for RAG...");
await initChatbot();

startBot();
