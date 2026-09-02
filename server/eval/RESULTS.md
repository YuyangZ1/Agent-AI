# RAG Evaluation Results

Real evaluation of the RAG path (`server/chat.js`) against the one test document
(`server/uploads/hbs-lean-startup.pdf`, 26 pages / 90,001 chars / ~181 chunks at
chunkSize=500, chunkOverlap=0), using 25 hand-written QA pairs grounded in the actual
PDF text (`qa-dataset.js`). No mocking — real OpenAI embedding + `gpt-5` calls, real
Redis cache, real `similaritySearchWithScore` over the real chunked document.

Run: `node eval/run-eval.js` · raw per-question data: `results.json` · generated 2026-09-02.

## Headline numbers

| Metric | Value |
|---|---|
| Queries run | 25 (0 errors) |
| Answer correctness (GPT-5-as-judge vs. reference answer) | **88%** (22/25) |
| Retrieval — avg. evidence-keyword coverage in top-4 context | **61.4%** |
| Retrieval — strict hit rate (all evidence keywords present) | **40%** (10/25) |
| Latency — mean / p50 / p95 / max | 9.36s / 5.52s / 27.0s / 48.4s |
| Embedding cache hit rate, query 2-25 | **100%** (212/212 chunks every time) |
| Cache speedup (query 1 cold vs. avg of queries 2-25) | **1.25×** (11.6s → 9.3s) |

Methodology for retrieval scoring: each QA pair has 2-4 short "evidence keyword" phrases
that only appear in the source-document sentence(s) the answer depends on. After
retrieval, the top-4 chunks' text is checked for those phrases (case-insensitive
substring match). This is a coverage/recall proxy, not a hand-labeled chunk-ID recall —
cheap to compute, but it directly answers "did retrieval actually surface the supporting
text, or did the model answer from something else."

## Three findings that came out of the data (not assumed going in)

**1. Every judged-incorrect answer had zero retrieval coverage — retrieval failure is the actual bottleneck, not generation.**
Questions 14, 16, and 21 were the only three judged "incorrect," and all three had
`retrievalCoverage: 0` — the top-4 chunks never contained the supporting sentence at
all. Every question where at least one evidence keyword was retrieved got a "correct"
verdict, even at fairly low coverage (33-67%). With only 25 questions this isn't a
statistically rigorous claim, but the pattern is clean enough to be a real signal: this
system's accuracy ceiling is set by retrieval, not by the LLM's ability to answer from
context it does receive. (Concretely: `chunkOverlap: 0` means a fact split across a
chunk boundary can end up in neither top-4 chunk — a plausible next thing to test.)

**2. The Redis embedding cache works exactly as designed, but doesn't move the metric people would assume it moves.**
Cache hit rate goes from 0% (query 1, cold) to 100% (every query after, 212/212 chunks)
— the caching logic itself is correct and behaves exactly as documented. But end-to-end
latency only drops 1.25× (11.6s → 9.3s avg), because embedding was never the dominant
cost: the `gpt-5` generation call dominates total latency (mean 9.4s, up to 48s) and the
cache does nothing for that. The honest claim is "the cache eliminates ~100% of
redundant embedding computation," not "the cache makes the app fast" — those are
different claims, and only the first one is backed by this data. If latency is the goal,
the LLM call, not the embedding step, is where the next optimization should go.

**3. The hybrid-ranker's confidence thresholds may be miscalibrated against real queries.**
`hybrid-ranker.js` treats confidence ≥0.75 as "trust the document" (`document_primary`).
Across these 25 queries — all answerable directly from the loaded document, with the
correct document loaded — average RAG confidence was 0.56, and only 1 of 25 queries
(0.749, question 3) came close to 0.75; none crossed it. If this holds at larger scale,
`document_primary` would almost never fire in production even when the document
answer is right and complete, meaning the system would lean on web search more than the
design intends. This is worth re-tuning with a labeled eval set per the original
comment in `hybrid-ranker.js` ("thresholds chosen empirically... can be tuned per-corpus
if needed") — this data suggests they should be.

## An honest caveat about the 88% accuracy number

"Hypothesis-Driven Entrepreneurship: The Lean Startup" (HBS 812-095) is a well-known,
widely-taught business school case. It's plausible `gpt-5` has partial knowledge of its
content from pretraining, independent of whatever gets retrieved. The judge model is
also `gpt-5`. So 88% correctness should be read as "the full pipeline produces correct
answers 88% of the time," not as clean proof that retrieval alone is driving that number
— finding #1 above (100% correctness whenever ≥1 evidence keyword was retrieved, 0%
when none were) is the more defensible piece of evidence that retrieval is actually
doing the work, since it's an internal comparison rather than a comparison to the
model's unknown prior knowledge. A cleaner version of this eval would run the same
questions against an obscure/synthetic document the model couldn't have seen in
training.

## What this eval does not cover

- Throughput / concurrent load (this ran 25 queries sequentially, single-user)
- Multi-document corpora (still just the one 26-page PDF)
- The web-search / hybrid-fusion path (`chat-mcp.js` + `hybrid-ranker.js` fusion) —
  this run only exercises the RAG half directly, not the full `/chat` endpoint
