import React, { useState } from "react";
import { Spin, Tag } from "antd";

// ── Layout containers ──────────────────────────────────────────────
const containerStyle = {
  display: "flex",
  justifyContent: "space-between",
  flexDirection: "column",
  marginBottom: "28px",
  paddingBottom: "16px",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
};

const userContainer = {
  textAlign: "right",
  marginBottom: "12px",
};

const agentContainer = {
  textAlign: "left",
};

// ── User bubble: terminal "> command" ──────────────────────────────
const userStyle = {
  maxWidth: "75%",
  textAlign: "left",
  background: "rgba(6, 182, 212, 0.06)",
  color: "#22d3ee",
  display: "inline-block",
  borderRadius: "6px",
  padding: "10px 14px",
  fontFamily: "JetBrains Mono, monospace",
  fontSize: "13px",
  border: "1px solid rgba(6, 182, 212, 0.2)",
};

const userPrefix = {
  color: "rgba(34, 211, 238, 0.6)",
  marginRight: "8px",
  userSelect: "none",
};

// ── Final answer card: cyan accent ─────────────────────────────────
const finalAnswerStyle = {
  maxWidth: "92%",
  textAlign: "left",
  backgroundColor: "rgba(255, 255, 255, 0.02)",
  color: "#f5f5f5",
  display: "block",
  borderRadius: "8px",
  padding: "16px 18px",
  marginBottom: "10px",
  borderLeft: "3px solid #06b6d4",
  border: "1px solid rgba(6, 182, 212, 0.18)",
  whiteSpace: "pre-wrap",
  fontSize: "14px",
  lineHeight: "1.65",
};

const finalAnswerHeader = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "8px",
  fontFamily: "JetBrains Mono, monospace",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(245, 245, 245, 0.5)",
};

const finalAnswerLabel = {
  color: "#22d3ee",
};

// ── Candidate cards (collapsed) ────────────────────────────────────
const candidateLabel = {
  fontFamily: "JetBrains Mono, monospace",
  fontSize: "11px",
  fontWeight: 500,
  color: "rgba(245, 245, 245, 0.45)",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  marginBottom: "6px",
  marginTop: "10px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const candidateStyleRag = {
  maxWidth: "78%",
  background: "rgba(6, 182, 212, 0.03)",
  color: "rgba(245, 245, 245, 0.85)",
  borderRadius: "6px",
  padding: "10px 12px",
  fontSize: "13px",
  border: "1px solid rgba(6, 182, 212, 0.1)",
  borderLeft: "2px solid rgba(6, 182, 212, 0.6)",
};

const candidateStyleMcp = {
  maxWidth: "78%",
  background: "rgba(0, 255, 136, 0.025)",
  color: "rgba(245, 245, 245, 0.85)",
  borderRadius: "6px",
  padding: "10px 12px",
  fontSize: "13px",
  border: "1px solid rgba(0, 255, 136, 0.1)",
  borderLeft: "2px solid rgba(0, 255, 136, 0.6)",
};

const toggleStyle = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(245,245,245,0.55)",
  cursor: "pointer",
  padding: "4px 10px",
  fontSize: "10px",
  fontFamily: "JetBrains Mono, monospace",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderRadius: "4px",
  marginTop: "10px",
};

// Tag color by hybrid-ranker strategy
const strategyColor = (strategy) => {
  switch (strategy) {
    case "document_primary":
      return "blue"; // cyan
    case "balanced":
      return "gold";
    case "web_primary":
      return "green"; // lime
    default:
      return "default";
  }
};

const QAItem = ({ each }) => {
  const [showCandidates, setShowCandidates] = useState(false);
  const a = each.answer || {};

  return (
    <div style={containerStyle}>
      {/* User question, terminal-style */}
      <div style={userContainer}>
        <div style={userStyle}>
          <span style={userPrefix}>$</span>
          {each.question}
        </div>
      </div>

      <div style={agentContainer}>
        {/* Headline: hybrid-ranked final answer */}
        {a.finalAnswer && (
          <div>
            <div style={finalAnswerHeader}>
              <span style={finalAnswerLabel}>◆ FINAL ANSWER</span>
              {a.strategy && (
                <Tag color={strategyColor(a.strategy)}>{a.strategy}</Tag>
              )}
              {typeof a.confidence === "number" && (
                <Tag>RAG·conf {a.confidence.toFixed(2)}</Tag>
              )}
            </div>
            <div style={finalAnswerStyle}>{a.finalAnswer}</div>
          </div>
        )}

        {/* Drill-down: raw candidates */}
        {(a.ragAnswer || a.mcpAnswer) && (
          <div>
            <button
              style={toggleStyle}
              onClick={() => setShowCandidates(!showCandidates)}
            >
              {showCandidates ? "▾ hide candidates" : "▸ show candidates"}
            </button>
            {showCandidates && (
              <div>
                {a.ragAnswer && (
                  <div>
                    <div style={candidateLabel}>
                      <span>›</span> RAG · document
                      {typeof a.ragWeight === "number" && (
                        <Tag>w {a.ragWeight}</Tag>
                      )}
                    </div>
                    <div style={candidateStyleRag}>{a.ragAnswer}</div>
                  </div>
                )}
                {a.mcpAnswer && a.mcpAnswer !== "N/A" && (
                  <div>
                    <div style={candidateLabel}>
                      <span>›</span> MCP · web (serpapi)
                      {typeof a.webWeight === "number" && (
                        <Tag>w {a.webWeight}</Tag>
                      )}
                    </div>
                    <div style={candidateStyleMcp}>{a.mcpAnswer}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error fallback */}
        {a.error && (
          <div
            style={{
              color: "#fca5a5",
              marginTop: 10,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
            }}
          >
            ✗ error: {a.error}
          </div>
        )}
      </div>
    </div>
  );
};

const RenderQA = (props) => {
  const { conversation, isLoading } = props;

  return (
    <>
      {(!conversation || conversation.length === 0) && !isLoading && (
        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "12px",
            color: "rgba(245, 245, 245, 0.3)",
            padding: "16px 4px",
            letterSpacing: "0.02em",
          }}
        >
          // upload a document and ask a question to begin
        </div>
      )}
      {conversation?.map((each, index) => (
        <QAItem key={index} each={each} />
      ))}
      {isLoading && (
        <div style={{ padding: "12px 4px" }}>
          <Spin size="small" />
          <span
            style={{
              marginLeft: 10,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
              color: "rgba(34, 211, 238, 0.7)",
              letterSpacing: "0.05em",
            }}
          >
            running rag + web search · fusing answers…
          </span>
        </div>
      )}
    </>
  );
};

export default RenderQA;
