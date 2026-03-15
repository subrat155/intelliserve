import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const generateEmbedding = async (text: string) => {
  const result = await ai.models.embedContent({
    model: 'gemini-embedding-2-preview',
    contents: [{ parts: [{ text }] }]
  });
  return result.embeddings[0].values;
};

export const getChatResponse = async (question: string, context: string) => {
  const prompt = `
    You are an AI Enterprise Support Chatbot named INTELLISERVE.
    Use the following context from company documents to answer the user's question.
    If the answer is not in the context, use your own general knowledge to answer, but prioritize company documents.
    If you still don't know, suggest contacting HR or IT.
    
    Context:
    ${context}
    
    Question: ${question}
    
    Answer:
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text;
};

export const cosineSimilarity = (vecA: number[], vecB: number[]) => {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magA * magB);
};
