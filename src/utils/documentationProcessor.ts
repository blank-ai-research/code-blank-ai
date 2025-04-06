import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';
import { createVectorStore } from './vectorStore';
import { PineconeStore } from '@langchain/pinecone';
import { Documentation } from './types';
import { withTelemetry } from './telemetry';

interface DocMetadata {
  language: string;
  source: string;
  type: 'syntax' | 'example' | 'explanation' | 'hint';
  topic?: string;
}

interface VectorQueryResult {
  pageContent: string;
  metadata: DocMetadata;
}

export class DocumentationProcessor {
  private vectorStore: PineconeStore | null = null;
  private textSplitter: RecursiveCharacterTextSplitter;
  private initialized: boolean = false;
  private documentationCache: Map<string, Documentation> = new Map();

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', ' ', ''],
      lengthFunction: (text) => text.length,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await withTelemetry('documentation', async () => {
        // Pre-load common documentation patterns
        await this.loadCommonPatterns();
      });

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize documentation processor: ${(error as Error).message}`);
    }
  }

  private async loadCommonPatterns(): Promise<void> {
    const commonPatterns = [
      'function declaration',
      'class definition',
      'interface',
      'type',
      'import/export',
      'async/await',
      'try/catch'
    ];

    await Promise.all(
      commonPatterns.map(async pattern => {
        const docs = await this.findDocumentation(pattern);
        if (docs) {
          this.documentationCache.set(pattern.toLowerCase(), docs);
        }
      })
    );
  }

  async processDocumentation(docs: Array<{content: string, metadata: DocMetadata}>) {
    const documents = await this.splitDocuments(docs);
    this.vectorStore = await createVectorStore(
      documents.map(d => d.pageContent),
      documents.map(d => d.metadata)
    );
    return this.vectorStore;
  }

  private async splitDocuments(docs: Array<{content: string, metadata: DocMetadata}>) {
    const documents: Document[] = [];
    
    for (const doc of docs) {
      const textChunks = await this.textSplitter.splitText(doc.content);
      documents.push(...textChunks.map(chunk => new Document({
        pageContent: chunk,
        metadata: doc.metadata
      })));
    }
    
    return documents;
  }

  async queryDocumentation(query: string, filters?: Partial<DocMetadata>, k: number = 5): Promise<VectorQueryResult[]> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    const results = await this.vectorStore.similaritySearch(query, k, filters);
    return results.map(doc => ({
      pageContent: doc.pageContent,
      metadata: doc.metadata as DocMetadata
    }));
  }

  async findRelevantHints(code: string, language: string, topic?: string) {
    const results = await this.queryDocumentation(
      code,
      {
        language,
        type: 'hint',
        ...(topic ? { topic } : {})
      },
      3
    );

    return results;
  }

  async findExamples(query: string, language: string): Promise<Array<{ content: string }>> {
    try {
      const results = await withTelemetry('documentation', async () => {
        return this.queryDocumentation(query, {
          type: 'example',
          language
        });
      });

      return results.map(result => ({
        content: result.pageContent
      }));
    } catch (error) {
      console.error('Error finding examples:', error);
      return [];
    }
  }

  async findDocumentation(query: string, metadata?: Partial<DocMetadata>): Promise<Documentation | null> {
    // Check cache first
    const cacheKey = query.toLowerCase();
    if (this.documentationCache.has(cacheKey)) {
      return this.documentationCache.get(cacheKey)!;
    }

    try {
      const results = await withTelemetry('documentation', async () => {
        return this.queryDocumentation(query, {
          type: 'explanation',
          ...metadata
        });
      });

      if (results.length === 0) return null;

      const doc: Documentation = {
        description: results[0].pageContent,
        syntax: results.find(r => r.metadata.type === 'syntax')?.pageContent,
        examples: results
          .filter(r => r.metadata.type === 'example')
          .map(r => r.pageContent)
      };

      // Cache the result
      this.documentationCache.set(cacheKey, doc);
      return doc;
    } catch (error) {
      console.error('Error finding documentation:', error);
      return null;
    }
  }

  async getDocumentationForFeature(feature: string, language: string) {
    const results = await this.queryDocumentation(
      feature,
      {
        language,
        type: 'explanation'
      },
      1
    );

    if (results.length === 0) {
      return null;
    }

    const examples = await this.findExamples(feature, language);

    return {
      explanation: results[0].pageContent,
      source: results[0].metadata.source,
      examples: examples.map(ex => ex.content)
    };
  }

  clearCache(): void {
    this.documentationCache.clear();
  }
}