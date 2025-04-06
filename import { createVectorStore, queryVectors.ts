import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

interface DocFragment {
  content: string;
  metadata: {
    language: string;
    feature: string;
    type: 'syntax' | 'description' | 'example';
    source: string;
  };
}

let vectorStore: MemoryVectorStore | null = null;

export async function createVectorStore(documents: DocFragment[]) {
  const embeddings = new OpenAIEmbeddings();
  const texts = documents.map(doc => doc.content);
  const metadatas = documents.map(doc => doc.metadata);
  
  vectorStore = await MemoryVectorStore.fromTexts(
    texts,
    metadatas,
    embeddings
  );
  
  return vectorStore;
}

export async function queryDocumentationVectors(
  feature: string,
  language: string,
  limit = 3
): Promise<any | null> {
  if (!vectorStore) {
    console.warn('Vector store not initialized');
    return null;
  }

  try {
    const results = await vectorStore.similaritySearch(
      `${feature} ${language} documentation`,
      limit
    );

    // Combine and format results
    const combinedDocs = {
      description: '',
      syntax: '',
      examples: [] as string[],
      source: ''
    };

    results.forEach(doc => {
      const { content, metadata } = doc.pageContent;
      switch (metadata.type) {
        case 'description':
          combinedDocs.description = content;
          break;
        case 'syntax':
          combinedDocs.syntax = content;
          break;
        case 'example':
          combinedDocs.examples.push(content);
          break;
      }
      if (!combinedDocs.source && metadata.source) {
        combinedDocs.source = metadata.source;
      }
    });

    return combinedDocs;
  } catch (error) {
    console.error('Vector query error:', error);
    return null;
  }
}

export class DocumentationService {
  async initialize() {
    // Load documentation from various sources
    const docs = await this.loadDocs([
      'framework-docs',
      'language-specs',
      'best-practices'
    ]);
    
    // Create embeddings and store
    await createVectorStore(docs);
  }

  async getContextualDocs(
    codeSnippet: string,
    language: string,
    framework: string
  ): Promise<string> {
    const query = this.createDocQuery(codeSnippet);
    const results = await queryDocumentationVectors(framework, language);
    
    return this.formatDocumentation(results);
  }
}