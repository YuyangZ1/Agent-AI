// cached-embeddings.js
// A drop-in replacement for OpenAIEmbeddings that caches per-chunk embeddings in Redis.
// Cache key: embed:<sha256(chunkText)>
// TTL: 7 days
//
// Why this exists:
//   The default MemoryVectorStore re-embeds every chunk on every request.
//   For a 30-page PDF that's ~200 OpenAI API calls per question (~$0.02, 2-5s latency).
//   With this cache layer, repeated queries on the same document become essentially free.

import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "redis";
import crypto from "crypto";

// Singleton Redis client (lazy init, reused across requests)
let redisClient = null;

async function getRedisClient() {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }
  redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });
  redisClient.on("error", (err) => {
    console.error("[Redis] connection error:", err.message);
  });
  await redisClient.connect();
  console.log("[Redis] connected");
  return redisClient;
}

// Hash a chunk's text content to produce a stable cache key.
// SHA-256 is overkill for collision-avoidance but is fast and deterministic.
// The model name is folded into the key so switching embedding models can't
// silently serve stale vectors from a different model under the same key.
function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function cacheKey(model, text) {
  return `embed:${model}:${hashText(text)}`;
}

const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * CachedEmbeddings extends OpenAIEmbeddings.
 * It intercepts embedDocuments() to add a Redis cache layer.
 * embedQuery() is left untouched (queries are not worth caching — they vary).
 */
export class CachedEmbeddings extends OpenAIEmbeddings {
  async embedDocuments(texts) {
    let client;
    try {
      client = await getRedisClient();
    } catch (err) {
      // If Redis is down, fall back to direct embedding (don't break the app)
      console.warn(
        "[CachedEmbeddings] Redis unavailable, falling back to direct embed:",
        err.message,
      );
      return super.embedDocuments(texts);
    }

    const results = new Array(texts.length);
    const missIndices = [];
    const missTexts = [];

    // Step 1: probe cache for every chunk
    const keys = texts.map((t) => cacheKey(this.model, t));
    const cached = await client.mGet(keys);

    for (let i = 0; i < texts.length; i++) {
      if (cached[i]) {
        results[i] = JSON.parse(cached[i]);
      } else {
        missIndices.push(i);
        missTexts.push(texts[i]);
      }
    }

    const hits = texts.length - missTexts.length;
    console.log(
      `[CachedEmbeddings] cache: ${hits}/${texts.length} hit (${((hits / texts.length) * 100).toFixed(1)}%)`,
    );

    // Step 2: batch-embed only the misses via OpenAI
    if (missTexts.length > 0) {
      const newVectors = await super.embedDocuments(missTexts);

      // Step 3: write new embeddings to cache and fill the results array
      const pipeline = client.multi();
      for (let j = 0; j < missTexts.length; j++) {
        const originalIdx = missIndices[j];
        results[originalIdx] = newVectors[j];
        pipeline.set(keys[originalIdx], JSON.stringify(newVectors[j]), {
          EX: TTL_SECONDS,
        });
      }
      await pipeline.exec();
    }

    return results;
  }
}
