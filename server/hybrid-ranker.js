// hybrid-ranker.js
// Fuses two candidate answers — one from RAG over the uploaded PDF, one from web search —
// into a single ranked final answer.
//
// Core idea: use the RAG retrieval similarity as a confidence signal.
//   - High confidence (≥ 0.75): trust the document, only let web supplement.
//   - Mid confidence (0.55 - 0.75): treat both sources as roughly equal.
//   - Low confidence (< 0.55): trust the web, treat document as background.
//
// The actual fusion is done by an LLM, prompted with the strategy and weights.
// This is a deliberately simple weighted-fusion design — easy to defend in interviews,
// easy to extend later with rerankers like RRF or cross-encoder rescoring.

import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

// Thresholds chosen empirically for OpenAI text-embedding-3-small + this RAG setup.
// They can be tuned per-corpus if needed.
const HIGH_CONF_THRESHOLD = 0.75;
const LOW_CONF_THRESHOLD = 0.55;

/**
 * Decide the fusion strategy based on RAG confidence.
 * Returns the strategy name and the two weights.
 */
export function decideStrategy(ragConfidence) {
  if (ragConfidence >= HIGH_CONF_THRESHOLD) {
    return { strategy: "document_primary", ragWeight: 0.8, webWeight: 0.2 };
  }
  if (ragConfidence >= LOW_CONF_THRESHOLD) {
    return { strategy: "balanced", ragWeight: 0.5, webWeight: 0.5 };
  }
  return { strategy: "web_primary", ragWeight: 0.2, webWeight: 0.8 };
}

const FUSION_TEMPLATE = `You are a hybrid answer-ranking system. You receive a user question and two
candidate answers — one grounded in a private document (via RAG), one from public web search.
Fuse them into a single, coherent final answer.

Apply this fusion strategy: {strategy}
- ragWeight: {ragWeight}  (how much to lean on the document answer)
- webWeight: {webWeight}  (how much to lean on the web answer)

RAG confidence on the document side: {ragConfidence}
(Range: 0 = no relevant chunks found; 1 = exact match to a chunk.)

Rules:
- If ragWeight is high, lead with the document answer and cite "from document".
  Use the web answer only to add recency or context the document lacks.
- If webWeight is high, lead with the web answer and cite "from web".
  The document answer should only be mentioned if it actually adds something.
- If balanced, synthesize both and cite both sources where relevant.
- Never invent facts not present in either candidate.
- Keep the final answer to 4 sentences maximum.

User question:
{query}

Document answer (RAG):
{ragAnswer}

Web answer (search):
{webAnswer}

Final fused answer:`;

/**
 * Fuse RAG and web answers into a single ranked output.
 *
 * @param {string} query           Original user question
 * @param {object} ragResult       { text, confidence, sources } from chat.js
 * @param {object} webResult       { text } from chat-mcp.js
 * @returns {Promise<object>}      { finalAnswer, strategy, ragWeight, webWeight, confidence }
 */
export async function hybridRank(query, ragResult, webResult) {
  const ragConfidence = ragResult.confidence ?? 0;
  const { strategy, ragWeight, webWeight } = decideStrategy(ragConfidence);

  const model = new ChatOpenAI({
    model: "gpt-5",
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = PromptTemplate.fromTemplate(FUSION_TEMPLATE);
  const formatted = await prompt.format({
    strategy,
    ragWeight: ragWeight.toFixed(1),
    webWeight: webWeight.toFixed(1),
    ragConfidence: ragConfidence.toFixed(2),
    query,
    ragAnswer: ragResult.text,
    webAnswer: webResult.text,
  });

  const response = await model.invoke(formatted);

  return {
    finalAnswer: response.content,
    strategy,
    ragWeight,
    webWeight,
    confidence: ragConfidence,
  };
}
