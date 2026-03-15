import React, { useState } from "react";
import PdfUploader from "./components/PdfUploader";
import ChatComponent from "./components/ChatComponent";
import RenderQA from "./components/RenderQA";
import { Layout, Typography } from "antd";
import "./App.css";

const chatComponentStyle = {
  position: "fixed",
  bottom: "26px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "78%",
  maxWidth: "1120px",
  padding: "14px 16px",
  borderRadius: "24px",
  background: "rgba(255, 255, 255, 0.08)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
  zIndex: 30,
};

const pdfUploaderStyle = {
  marginBottom: "28px",
  padding: "28px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 12px 36px rgba(0,0,0,0.22)",
};

const renderQAStyle = {
  minHeight: "360px",
  maxHeight: "460px",
  overflowY: "auto",
  padding: "24px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 12px 36px rgba(0,0,0,0.22)",
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
      <div className="bg-orb bg-orb-1"></div>
      <div className="bg-orb bg-orb-2"></div>
      <div className="bg-orb bg-orb-3"></div>

      <Header className="app-header">
        <div>
          <Title level={1} style={{ color: "#ffffff", margin: 0 }}>
            Agent AI
          </Title>
          <Text style={{ color: "rgba(255,255,255,0.70)" }}>
            Upload, ask, and explore your documents
          </Text>
        </div>
      </Header>

      <Content className="app-content">
        <div className="main-panel">
          <div style={pdfUploaderStyle}>
            <div className="section-title">Document Upload</div>
            <PdfUploader />
          </div>

          <div style={renderQAStyle}>
            <div className="section-title">Conversation</div>
            <RenderQA conversation={conversation} isLoading={isLoading} />
          </div>
        </div>
      </Content>

      <div style={chatComponentStyle}>
        <ChatComponent
          handleResp={handleResp}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      </div>
      <div className="signature">Designed & Built by Yuyang Zhou</div>
    </Layout>
  );
};

export default App;
