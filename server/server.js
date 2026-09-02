import express from "express"; //backend API backage
import cors from "cors"; //允许跨域访问一些API或者一些资源
import dotenv from "dotenv"; //.env的文件，需要加这个package才能用
import multer from "multer"; // Import multer
import chat from "./chat.js";
import chatMCP from "./chat-mcp.js";
import { hybridRank } from "./hybrid-ranker.js";

dotenv.config();

const app = express();
app.use(cors());

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

const PORT = 5001;

// Per-session uploaded-file tracking. Previously this was a single module-level
// `filePath` variable shared by every request, so two concurrent users (or two
// tabs) would silently overwrite each other's document. Keyed by the
// X-Session-Id header the frontend generates once per browser (see
// src/utils/session.js).
const sessionFiles = new Map();

function getSessionId(req) {
  return req.headers["x-session-id"];
}

app.post("/upload", upload.single("file"), (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    return res.status(400).send({ error: "Missing X-Session-Id header." });
  }

  // Use multer to handle file upload
  const filePath = req.file.path; // The path where the file is temporarily saved
  sessionFiles.set(sessionId, filePath);
  res.send(filePath + " upload successfully.");
});

app.get("/chat", async (req, res) => {
  try {
    const question = req.query.question;
    const sessionId = getSessionId(req);
    if (!sessionId) {
      return res.status(400).send({ error: "Missing X-Session-Id header." });
    }

    const filePath = sessionFiles.get(sessionId);
    if (!filePath) {
      return res.status(400).send({
        error: "No document uploaded yet for this session. Please upload a PDF first.",
      });
    }

    // Run RAG retrieval and web search in PARALLEL.
    // The previous version awaited them sequentially, so the user paid both
    // latencies back-to-back (~5-10s combined). Promise.all halves that.
    const [ragResp, mcpResp] = await Promise.all([
      chat(filePath, question),
      chatMCP(question),
    ]);

    // Fuse the two candidate answers using confidence-based hybrid ranking.
    // See server/hybrid-ranker.js for the strategy / weighting logic.
    const fused = await hybridRank(question, ragResp, mcpResp);

    res.send({
      finalAnswer: fused.finalAnswer,
      strategy: fused.strategy,
      ragWeight: fused.ragWeight,
      webWeight: fused.webWeight,
      confidence: fused.confidence,
      // Keep the raw candidates so the UI can show "show your work" details.
      ragAnswer: ragResp.text,
      mcpAnswer: mcpResp.text,
    });
  } catch (err) {
    console.error("[/chat] error:", err);
    res.status(500).send({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
