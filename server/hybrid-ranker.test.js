import { describe, it, expect } from "vitest";
import { decideStrategy } from "./hybrid-ranker.js";

describe("decideStrategy", () => {
  it("picks document_primary at and above the high-confidence threshold", () => {
    expect(decideStrategy(0.75)).toEqual({
      strategy: "document_primary",
      ragWeight: 0.8,
      webWeight: 0.2,
    });
    expect(decideStrategy(0.95)).toMatchObject({ strategy: "document_primary" });
  });

  it("picks balanced in the mid-confidence band", () => {
    expect(decideStrategy(0.55)).toEqual({
      strategy: "balanced",
      ragWeight: 0.5,
      webWeight: 0.5,
    });
    expect(decideStrategy(0.6)).toMatchObject({ strategy: "balanced" });
    // just below the high threshold should still be balanced, not document_primary
    expect(decideStrategy(0.749)).toMatchObject({ strategy: "balanced" });
  });

  it("picks web_primary below the low-confidence threshold", () => {
    expect(decideStrategy(0.54)).toEqual({
      strategy: "web_primary",
      ragWeight: 0.2,
      webWeight: 0.8,
    });
    expect(decideStrategy(0)).toMatchObject({ strategy: "web_primary" });
  });
});
