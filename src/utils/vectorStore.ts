import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { vectorStoreConfig } from './config';
import { withTelemetry, telemetry } from './telemetry';

const pinecone = new Pinecone({
  apiKey: vectorStoreConfig.pinecone.apiKey!
});

// Initialize vector store with telemetry tracking
export async function createVectorStore(texts: string[], metadatas?: Record<string, any>[]) {
  return withTelemetry('vectorStore', async () => {
    try {
      const index = pinecone.index(vectorStoreConfig.pinecone.index!);
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: vectorStoreConfig.openai.apiKey
      });

      const startTime = Date.now();
      const vectorStore = await PineconeStore.fromTexts(
        texts,
        metadatas || [],
        embeddings,
        {
          pineconeIndex: index,
          namespace: process.env.NODE_ENV
        }
      );

      telemetry.logEvent('info', 'vectorStore', `Created vector store with ${texts.length} documents`, {
        documentCount: texts.length,
        processingTime: Date.now() - startTime
      });

      return vectorStore;
    } catch (error) {
      telemetry.logEvent('error', 'vectorStore', `Error creating vector store: ${(error as Error).message}`);
      throw error;
    }
  });
}

// Query vectors with performance tracking
export async function queryVectors(
  vectorStore: PineconeStore, 
  query: string, 
  k: number = 5,
  filters?: Record<string, any>
) {
  return withTelemetry('vectorStore', async () => {
    try {
      const startTime = Date.now();
      const results = await vectorStore.similaritySearch(query, k, filters);

      telemetry.logEvent('info', 'vectorStore', 'Successfully queried vectors', {
        queryLength: query.length,
        resultCount: results.length,
        processingTime: Date.now() - startTime,
        filters: filters ? JSON.stringify(filters) : undefined
      });

      return results;
    } catch (error) {
      telemetry.logEvent('error', 'vectorStore', `Error querying vectors: ${(error as Error).message}`);
      throw error;
    }
  });
}

// Optional: Add caching for frequently accessed documents
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const documentCache = new Map<string, { data: any; timestamp: number }>();

export function getCachedDocument(key: string) {
  const cached = documentCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    telemetry.logEvent('info', 'vectorStore', 'Cache hit', { key });
    return cached.data;
  }
  return null;
}

export function cacheDocument(key: string, data: any) {
  documentCache.set(key, {
    data,
    timestamp: Date.now()
  });
  telemetry.logEvent('info', 'vectorStore', 'Document cached', { key });
}

// Clear expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  let cleared = 0;
  for (const [key, value] of documentCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      documentCache.delete(key);
      cleared++;
    }
  }
  if (cleared > 0) {
    telemetry.logEvent('info', 'vectorStore', `Cleared ${cleared} expired cache entries`);
  }
}, CACHE_TTL);