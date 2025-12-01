import { invokeLLM } from "./_core/llm";

/**
 * Vector search service for knowledge base retrieval
 * Uses in-memory storage for demo purposes
 */

interface VectorChunk {
  documentId: number;
  documentName: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
}

// In-memory vector storage for demo
const vectorStore: VectorChunk[] = [];

/**
 * Generate embedding for text using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Use a simple hash-based mock embedding for demo
    // In production, use OpenAI embeddings API
    const mockEmbedding = new Array(1536).fill(0).map((_, i) => {
      const hash = text.split('').reduce((acc, char, idx) => {
        return acc + char.charCodeAt(0) * (i + idx + 1);
      }, 0);
      return Math.sin(hash) * 0.5;
    });
    return mockEmbedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Split text into chunks
 */
function splitIntoChunks(text: string, chunkSize: number = 500): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[。.!?]\s*/);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence + '。';
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Add document to vector store
 */
export async function addDocumentToVectorStore(
  documentId: number,
  documentName: string,
  content: string
): Promise<void> {
  const chunks = splitIntoChunks(content);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const embedding = await generateEmbedding(chunk);
    
    vectorStore.push({
      documentId,
      documentName,
      chunkIndex: i,
      content: chunk,
      embedding,
    });
  }
}

/**
 * Search for similar chunks in vector store
 */
export async function searchVectorStore(
  query: string,
  topK: number = 3
): Promise<Array<{
  documentId: number;
  documentName: string;
  content: string;
  score: number;
}>> {
  if (vectorStore.length === 0) {
    return [];
  }
  
  const queryEmbedding = await generateEmbedding(query);
  
  const results = vectorStore.map(chunk => ({
    documentId: chunk.documentId,
    documentName: chunk.documentName,
    content: chunk.content,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));
  
  // Sort by score and return top K
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

/**
 * Clear vector store (for testing)
 */
export function clearVectorStore(): void {
  vectorStore.length = 0;
}
