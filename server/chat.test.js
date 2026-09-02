import { describe, it, expect } from "vitest";
import { createTextSplitter, EMBEDDING_MODEL } from "./chat.js";

describe("createTextSplitter", () => {
  it("is configured with the documented chunk size and no overlap", () => {
    const splitter = createTextSplitter();
    expect(splitter.chunkSize).toBe(500);
    expect(splitter.chunkOverlap).toBe(0);
  });

  it("splits long text into chunks that respect chunkSize, with no overlap between them", async () => {
    const splitter = createTextSplitter();
    // 1200 chars of filler, well over one chunk.
    const paragraph = "Lorem ipsum dolor sit amet consectetur. ".repeat(30);

    const chunks = await splitter.splitText(paragraph);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(500);
    }
    // No overlap: chunks concatenated should not contain any chunk's text twice.
    const rejoined = chunks.join("");
    expect(rejoined.length).toBeLessThanOrEqual(paragraph.length);
  });
});

describe("EMBEDDING_MODEL", () => {
  it("is pinned to an explicit OpenAI embedding model, not the library default", () => {
    // @langchain/openai defaults OpenAIEmbeddings to "text-embedding-ada-002"
    // when no model is passed. We pin explicitly so the model used for
    // embedding always matches what's documented (and what cache keys assume).
    expect(EMBEDDING_MODEL).toBe("text-embedding-3-small");
  });
});
