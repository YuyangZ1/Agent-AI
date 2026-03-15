import express from "express"; //backend API backage
import cors from "cors"; //允许跨域访问一些API或者一些资源
import dotenv from "dotenv"; //.env的文件，需要加这个package才能用
import multer from "multer"; // Import multer
import chat from "./chat.js";

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

let filePath;

app.post("/upload", upload.single("file"), (req, res) => {
  // Use multer to handle file upload
  filePath = req.file.path; // The path where the file is temporarily saved
  res.send(filePath + " upload successfully.");
});

app.get("/chat", async (req, res) => {
  const resp = await chat(filePath, req.query.question); // Use MCP-enhanced chat
  res.send({
    ragAnswer: resp.text,
    mcpAnswer: "N/A",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
