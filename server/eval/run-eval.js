// run-eval.js
// Real evaluation harness for the RAG path (server/chat.js) against
// server/uploads/hbs-lean-startup.pdf, using the hand-checked QA pairs in
// qa-dataset.js. No mocking: real OpenAI embedding/completion calls, real
// Redis cache, real similarity search over the actual chunked document.
//
// Measures, per query:
//   - retrieval quality: does the top-4 retrieved context actually contain
//     the evidence phrases for the answer? (coverage % + strict hit rate)
//   - answer correctness: GPT-5-as-judge verdict against the reference answer
//   - latency: wall-clock ms for the full chat() call (load+chunk+embed+
//     retrieve+generate)
//   - embedding cache hit rate: captured from CachedEmbeddings' own log line,
//     to quantify the Redis caching design's actual effect (query 1 = cold,
//     queries 2-25 reuse the same ~180 document chunks = should be ~100% hits)
//
// Usage: cd server && node eval/run-eval.js

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { performance } from "perf_hooks";
import { writeFileSync } from "fs";
import { createClient } from "redis";
import { ChatOpenAI } from "@langchain/openai";
import chat, { EMBEDDING_MODEL } from "../chat.js";
import { qaDataset } from "./qa-dataset.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const PDF_PATH = join(__dirname, "../uploads/hbs-lean-startup.pdf");

function quantile(sortedArr, q) {
  const pos = (sortedArr.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedArr[base + 1] !== undefined) {
    return sortedArr[base] + rest * (sortedArr[base + 1] - sortedArr[base]);
  }
  return sortedArr[base];
}

function stats(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    mean: sum / sorted.length,
    p50: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

// Capture the "[CachedEmbeddings] cache: X/Y hit (Z%)" line that
// cached-embeddings.js prints during embedDocuments(), without changing
// that file — we just intercept console.log for the duration of one call.
async function withCapturedCacheLog(fn) {
  const originalLog = console.log;
  let captured = null;
  console.log = (...args) => {
    const line = args.join(" ");
    if (line.includes("[CachedEmbeddings]")) {
      const m = line.match(/cache: (\d+)\/(\d+) hit \(([\d.]+)%\)/);
      if (m) {
        captured = { hits: Number(m[1]), total: Number(m[2]), pct: Number(m[3]) };
      }
    } else {
      originalLog(...args);
    }
  };
  try {
    const result = await fn();
    return { result, cacheInfo: captured };
  } finally {
    console.log = originalLog;
  }
}

async function flushEmbeddingCache() {
  const client = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
  await client.connect();
  const keys = await client.keys(`embed:${EMBEDDING_MODEL}:*`);
  if (keys.length > 0) {
    await client.del(keys);
  }
  await client.quit();
  return keys.length;
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function judge(judgeModel, question, referenceAnswer, generatedAnswer) {
  const prompt = `You are grading whether a generated answer is factually consistent with a reference answer, for a document Q&A system.

Question: ${question}

Reference answer (ground truth, from the source document): ${referenceAnswer}

Generated answer (to grade): ${generatedAnswer}

Grade "correct" if the generated answer captures the key facts in the reference answer (wording may differ). Grade "incorrect" if it misses, contradicts, or fabricates the key facts.

Respond with ONLY a JSON object, no other text: {"verdict": "correct" | "incorrect", "reason": "<one short sentence>"}`;

  const response = await judgeModel.invoke(prompt);
  const parsed = extractJson(response.content);
  if (!parsed || !["correct", "incorrect"].includes(parsed.verdict)) {
    return { verdict: "unparseable", reason: response.content?.slice(0, 200) };
  }
  return parsed;
}

function retrievalCoverage(sources, evidenceKeywords) {
  const context = sources.map((s) => s.content).join(" \n ").toLowerCase();
  const matched = evidenceKeywords.filter((k) => context.includes(k.toLowerCase()));
  return {
    matched: matched.length,
    total: evidenceKeywords.length,
    coverage: matched.length / evidenceKeywords.length,
    missingKeywords: evidenceKeywords.filter((k) => !matched.includes(k)),
  };
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY not set — aborting.");
    process.exit(1);
  }

  console.log(`Flushing Redis embedding cache for model=${EMBEDDING_MODEL} to force a real cold start...`);
  const flushed = await flushEmbeddingCache();
  console.log(`Flushed ${flushed} cached embedding key(s).\n`);

  const judgeModel = new ChatOpenAI({ model: "gpt-5", apiKey: process.env.OPENAI_API_KEY });

  const results = [];
  const startAll = performance.now();

  for (const item of qaDataset) {
    const startedAt = performance.now();
    let record = { id: item.id, question: item.question };
    try {
      const { result: ragResult, cacheInfo } = await withCapturedCacheLog(() =>
        chat(PDF_PATH, item.question),
      );
      const latencyMs = performance.now() - startedAt;

      const coverage = retrievalCoverage(ragResult.sources, item.evidenceKeywords);
      const judgeVerdict = await judge(
        judgeModel,
        item.question,
        item.referenceAnswer,
        ragResult.text,
      );

      record = {
        ...record,
        latencyMs: Math.round(latencyMs),
        embedCacheHitPct: cacheInfo ? cacheInfo.pct : null,
        embedCacheHits: cacheInfo ? `${cacheInfo.hits}/${cacheInfo.total}` : null,
        ragConfidence: Number(ragResult.confidence.toFixed(3)),
        retrievalCoverage: Number(coverage.coverage.toFixed(2)),
        retrievalStrictHit: coverage.coverage === 1 ? 1 : 0,
        missingKeywords: coverage.missingKeywords,
        judgeVerdict: judgeVerdict.verdict,
        judgeReason: judgeVerdict.reason,
        generatedAnswer: ragResult.text,
      };

      console.log(
        `[${item.id}/${qaDataset.length}] ${Math.round(latencyMs)}ms | cache ${
          cacheInfo ? cacheInfo.pct + "%" : "n/a"
        } | retrieval ${(coverage.coverage * 100).toFixed(0)}% | judge: ${judgeVerdict.verdict} | ${item.question.slice(0, 60)}`,
      );
    } catch (err) {
      record.error = err.message;
      console.error(`[${item.id}/${qaDataset.length}] ERROR: ${err.message}`);
    }
    results.push(record);
  }

  const totalWallMs = performance.now() - startAll;

  const ok = results.filter((r) => !r.error);
  const latencies = ok.map((r) => r.latencyMs);
  const latencyStats = stats(latencies);
  const coldLatency = ok[0]?.latencyMs ?? null;
  const warmLatencies = ok.slice(1).map((r) => r.latencyMs);
  const warmStats = warmLatencies.length ? stats(warmLatencies) : null;

  const retrievalCoverageAvg =
    ok.reduce((sum, r) => sum + r.retrievalCoverage, 0) / ok.length;
  const retrievalStrictHitRate =
    ok.reduce((sum, r) => sum + r.retrievalStrictHit, 0) / ok.length;
  const judgeCorrect = ok.filter((r) => r.judgeVerdict === "correct").length;
  const judgeUnparseable = ok.filter((r) => r.judgeVerdict === "unparseable").length;
  const answerAccuracy = judgeCorrect / ok.length;

  const summary = {
    generatedAt: new Date().toISOString(),
    document: {
      file: "hbs-lean-startup.pdf",
      pages: 26,
      chars: 90001,
      chunkSize: 500,
      chunkOverlap: 0,
      approxChunks: Math.ceil(90001 / 500),
    },
    embeddingModel: EMBEDDING_MODEL,
    queryCount: qaDataset.length,
    errorCount: results.length - ok.length,
    retrieval: {
      avgCoverage: Number(retrievalCoverageAvg.toFixed(3)),
      strictHitRateAt4: Number(retrievalStrictHitRate.toFixed(3)),
    },
    answerCorrectness: {
      judgeModel: "gpt-5",
      accuracy: Number(answerAccuracy.toFixed(3)),
      correct: judgeCorrect,
      total: ok.length,
      unparseableJudgeResponses: judgeUnparseable,
    },
    latencyMs: {
      overall: latencyStats,
      coldFirstQuery: coldLatency,
      warmSubsequentQueriesAvg: warmStats ? Math.round(warmStats.mean) : null,
      cacheSpeedupFactor:
        coldLatency && warmStats ? Number((coldLatency / warmStats.mean).toFixed(2)) : null,
    },
    totalWallClockMs: Math.round(totalWallMs),
  };

  writeFileSync(join(__dirname, "results.json"), JSON.stringify({ summary, results }, null, 2));

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nFull per-query results written to server/eval/results.json`);
}

main().catch((err) => {
  console.error("Fatal error running eval:", err);
  process.exit(1);
});
