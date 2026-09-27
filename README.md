# WhatsApp RAG Chatbot

A WhatsApp bot powered by **LangChain** (RAG + conversational memory) and **Groq (Llama 3.3)**, connected to WhatsApp via **Baileys**.

The bot doesn't just answer questions — it remembers what you tell it. Ask it something, tell it a fact about yourself, and later ask "what do you know about me?" to see it retrieve and reason over what it's learned.

## Features

- **Retrieval-Augmented Generation (RAG)** — answers grounded in retrieved context rather than pure model recall
- **Conversational memory** — the bot tracks and extracts facts from the conversation as it goes
- **Fact retrieval** — ask "what do you know about me?" and the bot pulls back what it's learned about you
- **Native WhatsApp integration** — no separate app or web client; runs through your existing WhatsApp number via a QR-code login

## Tech Stack

| Layer | Tool |
|---|---|
| WhatsApp connection | [Baileys](https://github.com/WhiskeySockets/Baileys) (unofficial WhatsApp Web API) |
| LLM orchestration | LangChain (`@langchain/classic`, `@langchain/community`, `@langchain/core`, `@langchain/textsplitters`) |
| LLM inference | Groq (Llama 3.3) via `@langchain/groq` |
| Embeddings | Hugging Face Inference API |
| Schema validation | Zod |
| Logging | Pino |
| Runtime | Node.js (ESM) |

## Prerequisites

- Node.js (v18+ recommended, since the project uses ESM `"type": "module"`)
- A WhatsApp account (a secondary/test number is recommended — Baileys uses the WhatsApp Web protocol and violates WhatsApp's official ToS for automation)
- API keys for:
  - [Groq](https://console.groq.com/)
  - [Hugging Face](https://huggingface.co/settings/tokens)
  - [Google Gemini](https://aistudio.google.com/app/apikey)
  - DigitalOcean Model Access (if using DO's inference endpoints)

## Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/hooriali/whatsapp-chatbot.git
   cd whatsapp-chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example file and fill in your keys:
   ```bash
   cp _env.example .env
   ```
   ```env
   GROQ_API_KEY=your_groq_key_here
   HUGGINGFACEHUB_API_KEY=your_huggingface_key_here
   GEMINI_API_KEY=your_gemini_key_here
   DIGITAL_OCEAN_MODEL_ACCESS_KEY=your_digitalocean_model_access_key_here
   ```

4. **Run the bot**
   ```bash
   npm start
   ```

5. **Link your WhatsApp account**

   A QR code will print to the terminal. Open WhatsApp on your phone → **Settings → Linked Devices → Link a Device** → scan the code. Once linked, the bot is live on that number.

## Project Structure

```
whatsapp-chatbot/
├── langchain/          # RAG pipeline, memory, and retrieval logic
├── index.js            # Bot entry point — Baileys connection + message handling
├── demo.js             # Standalone demo/test script
├── _env.example        # Template for required environment variables
├── package.json
└── package-lock.json
```

## Usage

Once the bot is running and linked:
- Message it on WhatsApp like you would a contact
- Ask it questions — it retrieves relevant context before answering
- Share facts about yourself in conversation, then ask **"what do you know about me?"** to see the memory + retrieval feature in action

## Disclaimer

This project uses Baileys, an unofficial library for the WhatsApp Web protocol. It is not affiliated with, endorsed by, or supported by WhatsApp/Meta. Use a test number, and be aware automated use can risk that number being flagged or banned.

## Origin

Built as part of an AI bootcamp assignment, exploring RAG and conversational memory in a real-world chat interface.
