# AgentAI – AI Document Assistant

AgentAI is a full-stack AI application that allows users to upload PDF documents and ask questions about their content.  
The system retrieves relevant document context and uses a large language model to generate answers.

This project demonstrates how to build a modern AI application using a React frontend and a Node.js backend with a retrieval-augmented generation (RAG) workflow.

---

# Features

- Upload PDF documents
- Ask natural language questions about the document
- AI-generated answers based on document context
- Retrieval-augmented generation (RAG)
- Simple chat interface

---

# Tech Stack

## Frontend
- React
- JavaScript
- CSS

## Backend
- Node.js
- Express

## AI / LLM
- OpenAI API
- Vector-based document retrieval

---

# System Architecture

The application follows a simple AI retrieval workflow:

1. User uploads a PDF document  
2. Backend processes the document content  
3. Relevant context is retrieved from the document  
4. The user submits a question  
5. The AI model generates an answer based on the retrieved context  

This approach improves answer accuracy by grounding responses in the document content.

---

# Project Structure

Agent-AI
│
├── public
│
├── src
│   ├── components
│   │   ├── ChatComponent.js
│   │   ├── PdfUploader.js
│   │   └── RenderQA.js
│   │
│   ├── App.js
│   ├── App.css
│   └── index.css
│
├── server
│   ├── server.js
│   ├── chat.js
│   └── package.json
│
├── package.json
└── README.md

---

# Running the Project

## 1. Install dependencies

Frontend
npm install

Backend
cd server
npm install
---

## 2. Start the backend server

node server.js
---

## 3. Start the frontend application

npm start
The frontend will start on:
http://localhost:3000

---

# Environment Variables

This project requires an API key to access the language model.

Create a `.env` file inside the `server` directory:

OPENAI_API_KEY=your_api_key_here

Important:

- `.env` files are **not included in this repository**
- Never commit API keys to version control

---

# Security Notes

To protect sensitive information:

- API keys are stored in environment variables
- `.env` files are excluded via `.gitignore`
- No secrets are stored in the codebase

---

# Future Improvements

Potential improvements for the project:

- Support multiple document uploads
- Improve document chunking and retrieval accuracy
- Add streaming responses
- Deploy the application to a cloud platform

---

# Author

Yuyang Zhou
