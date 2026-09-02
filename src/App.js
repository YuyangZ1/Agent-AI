import React, { useState } from "react";
import PdfUploader from "./components/PdfUploader";
import ChatComponent from "./components/ChatComponent";
import RenderQA from "./components/RenderQA";
import { Layout, Typography } from "antd";
import "./App.css";

// Floating chat dock — glassy, sits above the bottom edge, has subtle cyan glow.
const chatComponentStyle = {
  position: "fixed",
  bottom: "28px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "82%",
  maxWidth: "1200px",
  padding: "16px 18px",
  borderRadius: "16px",
  background:
    "linear-gradient(180deg, rgba(22,18,38,0.85), rgba(10,6,18,0.75))",
  backdropFilter: "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  boxShadow:
    "0 24px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(34, 211, 238, 0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
  zIndex: 30,
};

const sectionBlockStyle = {
  marginBottom: "24px",
  padding: "26px",
  borderRadius: "14px",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  position: "relative",
};

const renderQAStyle = {
  ...sectionBlockStyle,
  minHeight: "340px",
  maxHeight: "460px",
  overflowY: "auto",
  marginBottom: 0,
};

const App = () => {
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { Header, Content } = Layout;
  const { Title, Text } = Typography;

  const handleResp = (question, answer) => {
    setConversation((prev) => [...prev, { question, answer }]);
  };

  return (
    <Layout className="app-shell">
      {/* ── Top status bar ─────────────────────────────────────── */}
      <div className="status-bar">
        <span className="status-indicator">
          <span className="status-dot"></span>
          LIVE
        </span>
        <span>v1.0.0</span>
        <span>·</span>
        <span>node 20 · react 18</span>
        <span className="status-spacer"></span>
        <span className="tech-chips">
          <span className="tech-chip cyan">RAG</span>
          <span className="tech-chip cyan">MCP</span>
          <span className="tech-chip">REDIS</span>
          <span className="tech-chip">SERPAPI</span>
          <span className="tech-chip violet">GPT-5</span>
        </span>
      </div>

      {/* ── Header (title + subtitle) ──────────────────────────── */}
      <Header className="app-header">
        <div>
          <Title level={1}>DocuRAG</Title>
          <Text>Hybrid RAG + web search for your documents</Text>
        </div>
      </Header>

      {/* ── Main content panel ─────────────────────────────────── */}
      <Content className="app-content">
        <div className="main-panel">
          <div style={sectionBlockStyle}>
            <div className="section-title">DOC · upload</div>
            <PdfUploader />
          </div>

          <div style={renderQAStyle}>
            <div className="section-title">Q&amp;A · conversation log</div>
            <RenderQA conversation={conversation} isLoading={isLoading} />
          </div>
        </div>
      </Content>

      {/* ── Floating chat dock ─────────────────────────────────── */}
      <div style={chatComponentStyle}>
        <ChatComponent
          handleResp={handleResp}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      </div>

      <div className="signature">Built by Yuyang Zhou</div>
    </Layout>
  );
};

export default App;
