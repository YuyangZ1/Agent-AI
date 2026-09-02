import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CachedEmbeddings } from "./cached-embeddings.js";

// Must match the model CachedEmbeddings was populated with, since the Redis
// cache key is content-hash-only (no model in the key) — swapping models
// silently without bumping this would serve stale vectors from a different model.
export const EMBEDDING_MODEL = "text-embedding-3-small";

export const createTextSplitter = () =>
  new RecursiveCharacterTextSplitter({
    chunkSize: 500, //  (in terms of number of characters)
    chunkOverlap: 0,
  });

const chat = async (filePath = "./uploads/hbs-lean-startup.pdf", query) => {
  // Get API key from environment
  const apiKey = process.env.OPENAI_API_KEY;

  // step 1:
  const loader = new PDFLoader(filePath);

  const data = await loader.load();

  // step 2:
  const textSplitter = createTextSplitter();

  const splitDocs = await textSplitter.splitDocuments(data);

  // step 3

  // Use Redis-cached embeddings to avoid re-computing chunk vectors on every query.
  // See cached-embeddings.js for the cache key design (SHA-256 of chunk content, 7-day TTL).
  const embeddings = new CachedEmbeddings({
    model: EMBEDDING_MODEL,
    ...(apiKey && { apiKey }),
  });

  const vectorStore = await MemoryVectorStore.fromDocuments(
    splitDocs,
    embeddings,
  );

  // step 4: retrieval

  // const relevantDocs = await vectorStore.similaritySearch(
  // "What is task decomposition?"
  // );

  // step 5: qa w/ customize the prompt
  const model = new ChatOpenAI({
    model: "gpt-5",
    ...(apiKey && { apiKey }),
  });

  const template = `Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
Use three sentences maximum and keep the answer as concise as possible.

{context}
Question: {question}
Helpful Answer:`;
  const prompt = PromptTemplate.fromTemplate(template);

  // Retrieve top-4 chunks WITH similarity scores.
  // The scores let the hybrid ranker (see hybrid-ranker.js) judge how confident
  // RAG is about the answer, which decides the fusion weighting with web results.
  const docsWithScores = await vectorStore.similaritySearchWithScore(query, 4);
  const relevantDocs = docsWithScores.map(([doc]) => doc);

  // Average the top-k similarity scores into a single "RAG confidence" signal.
  // Range: 0 (no semantic match anywhere) to 1 (perfect match).
  const confidence =
    docsWithScores.length > 0
      ? docsWithScores.reduce((sum, [, score]) => sum + score, 0) /
        docsWithScores.length
      : 0;

  // Format context from retrieved documents
  const context = relevantDocs.map((doc) => doc.pageContent).join("\n\n");

  // Create a simple chain using the prompt template
  const formattedPrompt = await prompt.format({
    context,
    question: query,
  });

  // Get response from the model
  const response = await model.invoke(formattedPrompt);

  return {
    text: response.content,
    confidence,
    sources: docsWithScores.map(([doc, score]) => ({
      content: doc.pageContent,
      similarity: score,
    })),
  };
};

export default chat;
