import { describe, it, expect, vi, beforeEach } from "vitest";

// The Redis client is a module-level singleton inside cached-embeddings.js,
// so each test needs a fresh module graph (vi.resetModules + dynamic import)
// to get an isolated "connection" and exercise both the hit/miss path and
// the Redis-down fallback path independently.
describe("CachedEmbeddings", () => {
  let store;

  beforeEach(() => {
    store = new Map();
    vi.resetModules();
  });

  async function loadCachedEmbeddings({ connectShouldFail = false } = {}) {
    vi.doMock("redis", () => ({
      createClient: () => ({
        isOpen: true,
        on: () => {},
        connect: async () => {
          if (connectShouldFail) throw new Error("ECONNREFUSED");
        },
        mGet: async (keys) => keys.map((k) => store.get(k) ?? null),
        multi: () => {
          const ops = [];
          return {
            set: (key, val) => ops.push([key, val]),
            exec: async () => {
              for (const [key, val] of ops) store.set(key, val);
            },
          };
        },
      }),
    }));

    const { OpenAIEmbeddings } = await import("@langchain/openai");
    const { CachedEmbeddings } = await import("./cached-embeddings.js");
    return { OpenAIEmbeddings, CachedEmbeddings };
  }

  it("only calls OpenAI for cache misses; repeated chunks are served from Redis", async () => {
    const { OpenAIEmbeddings, CachedEmbeddings } = await loadCachedEmbeddings();
    const embedSpy = vi
      .spyOn(OpenAIEmbeddings.prototype, "embedDocuments")
      .mockImplementation(async (texts) => texts.map(() => [0.1, 0.2, 0.3]));

    const embeddings = new CachedEmbeddings({
      apiKey: "test-key",
      model: "text-embedding-3-small",
    });

    const first = await embeddings.embedDocuments(["chunk a", "chunk b"]);
    expect(embedSpy).toHaveBeenCalledTimes(1);
    expect(embedSpy).toHaveBeenCalledWith(["chunk a", "chunk b"]);
    expect(first).toEqual([
      [0.1, 0.2, 0.3],
      [0.1, 0.2, 0.3],
    ]);

    // "chunk a" repeats and should now come from cache; only "chunk c" is new.
    const second = await embeddings.embedDocuments(["chunk a", "chunk c"]);
    expect(embedSpy).toHaveBeenCalledTimes(2);
    expect(embedSpy).toHaveBeenLastCalledWith(["chunk c"]);
    expect(second).toEqual([
      [0.1, 0.2, 0.3],
      [0.1, 0.2, 0.3],
    ]);
  });

  it("scopes cache keys by model, so switching models can't serve stale vectors", async () => {
    const { CachedEmbeddings } = await loadCachedEmbeddings();
    vi.spyOn(
      (await import("@langchain/openai")).OpenAIEmbeddings.prototype,
      "embedDocuments",
    ).mockImplementation(async (texts) => texts.map(() => [1, 1, 1]));

    const small = new CachedEmbeddings({
      apiKey: "test-key",
      model: "text-embedding-3-small",
    });
    const ada = new CachedEmbeddings({
      apiKey: "test-key",
      model: "text-embedding-ada-002",
    });

    await small.embedDocuments(["same chunk"]);
    await ada.embedDocuments(["same chunk"]);

    // Two distinct keys should have been written — one per model — not one shared key.
    const keys = [...store.keys()];
    expect(keys).toHaveLength(2);
    expect(keys.some((k) => k.includes("text-embedding-3-small"))).toBe(true);
    expect(keys.some((k) => k.includes("text-embedding-ada-002"))).toBe(true);
  });

  it("degrades to direct OpenAI calls when Redis is unreachable", async () => {
    const { OpenAIEmbeddings, CachedEmbeddings } = await loadCachedEmbeddings({
      connectShouldFail: true,
    });
    const embedSpy = vi
      .spyOn(OpenAIEmbeddings.prototype, "embedDocuments")
      .mockImplementation(async (texts) => texts.map(() => [0.4, 0.5, 0.6]));

    const embeddings = new CachedEmbeddings({
      apiKey: "test-key",
      model: "text-embedding-3-small",
    });

    const result = await embeddings.embedDocuments(["chunk a"]);
    expect(embedSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual([[0.4, 0.5, 0.6]]);
  });
});
