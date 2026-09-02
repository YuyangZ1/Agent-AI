# DocuRAG – Hybrid RAG Document Q&A

DocuRAG is a full-stack AI application that lets users upload PDF documents and ask natural-language questions about them. It combines retrieval-augmented generation (RAG) over the uploaded document with parallel web search, then fuses the two answers using a confidence-based hybrid ranking strategy.

This project demonstrates a production-style RAG pipeline: cached embeddings, MCP-based tool integration, parallel execution, and explainable answer fusion.

---

## Features

- Upload PDF documents through a drag-and-drop UI
- Ask natural-language questions about the document
- Retrieval-augmented generation (RAG) with semantic search over chunked content
- **Redis-backed embedding cache** to avoid recomputing chunk vectors on every query
- **Hybrid ranking** that fuses document and web-search answers based on RAG confidence
- **MCP (Model Context Protocol)** integration for swappable tools (SerpAPI today, anything tomorrow)
- Parallel execution of RAG and web search to roughly halve latency
- Voice input (speech-to-text) and voice output (text-to-speech) modes

---

## System Architecture

```
                      ┌─────────────────────┐
   User uploads PDF ─▶│ POST /upload        │
                      │ multer → uploads/    │
                      └─────────────────────┘

                      ┌──────────────────────┐
   User asks Q     ──▶│ GET /chat            │
                      └──────────┬───────────┘
                                 │
                ┌────────────────┴─────────────────┐
                │      Promise.all in parallel      │
                ▼                                   ▼
   ┌──── RAG path (chat.js) ────┐    ┌─── MCP path (chat-mcp.js) ──┐
   │  PDFLoader → chunks         │    │  StdioClientTransport →     │
   │  CachedEmbeddings           │    │  mcp-server.js              │
   │    └─ Redis (SHA-256 key,   │    │    └─ SerpAPI (Google)      │
   │       7-day TTL)            │    │  GPT-5 summarizes results   │
   │  MemoryVectorStore          │    └─────────────────────────────┘
   │  similaritySearchWithScore  │
   │  GPT-5 answers + confidence │
   └─────────────────────────────┘
                │                                   │
                └────────────────┬──────────────────┘
                                 ▼
                  ┌──── Hybrid Ranker ────────┐
                  │  Confidence ≥ 0.75 →      │
                  │    document_primary       │
                  │  0.55–0.75 → balanced     │
                  │  < 0.55 → web_primary     │
                  │  LLM fuses both answers   │
                  └───────────────────────────┘
                                 ▼
                       Final Answer + sources
```

---

## Tech Stack

**Frontend**
- React 18, AntDesign 5
- react-speech-recognition (ASR), speak-tts (TTS)

**Backend**
- Node.js (ES modules), Express
- LangChain (text splitters, vector store, retrievers, chat models)
- OpenAI API (GPT-5 for generation, text-embedding-3-small for embeddings)
- **Redis** for embedding cache
- **Model Context Protocol (MCP) SDK** for tool integration
- SerpAPI for web search
- multer for file uploads

---

## Project Structure

```
DocuRAG/
├── public/                 # React static assets
├── src/
│   ├── components/
│   │   ├── ChatComponent.js   # Chat input + voice modes
│   │   ├── PdfUploader.js     # Drag-and-drop PDF upload
│   │   └── RenderQA.js        # Final answer + collapsible candidates
│   ├── App.js
│   ├── App.css
│   └── index.css
├── server/
│   ├── server.js              # Express entry, parallel orchestration
│   ├── chat.js                # RAG pipeline (load, chunk, embed, retrieve, answer)
│   ├── cached-embeddings.js   # Redis-backed OpenAIEmbeddings subclass
│   ├── hybrid-ranker.js       # Confidence-based answer fusion
│   ├── chat-mcp.js            # MCP client (consumes search_web tool)
│   ├── mcp-server.js          # MCP server (wraps SerpAPI)
│   └── package.json
├── package.json
└── README.md
```

---

## Running the Project

### 1. Install dependencies

The LangChain ecosystem currently has a peer-dependency conflict around `zod` versions; use `--legacy-peer-deps` to bypass it (we don't use the conflicting package).

```bash
# Frontend
npm install --legacy-peer-deps

# Backend
cd server
npm install --legacy-peer-deps
cd ..
```

### 2. Start Redis

```bash
brew install redis           # if not installed
brew services start redis
redis-cli ping               # should return PONG
```

### 3. Configure environment variables

Create `server/.env`:

```
OPENAI_API_KEY=sk-...
SERPAPI_KEY=...
REDIS_URL=redis://localhost:6379
```

### 4. Start the app

```bash
npm run dev
```

This runs the React dev server on `http://localhost:3000` and the Express backend on `http://localhost:5001` concurrently.

---

## Design Decisions

**Chunking** — `RecursiveCharacterTextSplitter` with `chunkSize: 500` and `chunkOverlap: 0`. Smaller chunks improve retrieval precision; the recursive splitter prefers natural boundaries (paragraph → sentence → word) over raw character splits.

**Embedding cache** — Cache key is `embed:<sha256(chunk_content)>` with a 7-day TTL. Content-based hashing means caches survive re-uploads, filename changes, and even cross-document chunk reuse. Lookups are pipelined (`mGet` / `multi`) to minimize round trips. On Redis failure, the system degrades gracefully to direct OpenAI calls — caching is a speedup, not a hard dependency.

**Vector store** — `MemoryVectorStore` for the prototype. For production scale (>10k chunks), drop in `pgvector` or Pinecone without changing application code.

**Hybrid ranking strategy** — Three-tier (document_primary / balanced / web_primary) based on average top-k retrieval similarity. Tier thresholds chosen empirically; a labeled eval set would let you tune per-corpus. LLM-based fusion produces a coherent final answer instead of brittle hard-picking.

**MCP for web search** — Wrapping SerpAPI as an MCP tool decouples the search backend from the chat orchestrator. Adding more tools (database lookup, email, file system) requires no changes to `chat-mcp.js`.

**Parallel execution** — `Promise.all` for the RAG and web paths roughly halves end-to-end latency compared to the original sequential `await`.

---

## Evaluation

Retrieval and answer quality are measured, not assumed — see [`server/eval/`](server/eval/)
for the harness (25 hand-written QA pairs grounded in the actual test PDF, real OpenAI +
Redis calls, no mocking) and [`server/eval/RESULTS.md`](server/eval/RESULTS.md) for the
full writeup.

| Metric | Value |
|---|---|
| Answer correctness (GPT-5-as-judge) | 88% (22/25) |
| Retrieval — avg. evidence coverage in top-4 context | 61.4% |
| Retrieval — strict hit rate | 40% |
| Latency — mean / p50 / p95 | 9.4s / 5.5s / 27.0s |
| Embedding cache hit rate (post cold-start) | 100% |
| Cache latency speedup (cold vs. warm) | 1.25× |

The writeup also covers three findings the numbers surfaced: every judged-incorrect
answer traced back to a retrieval miss (not a generation failure), the Redis cache
eliminates ~100% of redundant embedding calls but barely moves end-to-end latency
because GPT-5 generation — not embedding — dominates it, and the hybrid-ranker's
confidence thresholds look miscalibrated against real queries on the actual document.

---

## Environment Notes

- `.env` is excluded via `.gitignore`; never commit secrets
- The PDF uploads in `server/uploads/` are not committed and are wiped on restart in containers

---

## Future Improvements

- Multi-document support with per-document collection namespacing
- Cross-encoder reranker on top of dense retrieval for higher precision
- Streaming responses for both the candidate answers and the final fused answer
- Per-user session isolation (current prototype is single-user)
- Production-grade vector store (pgvector / Pinecone) for >10k chunks

---

## Author

Yuyang Zhou
