// Load environment variables if not already loaded
import 'dotenv/config';

export const vectorStoreConfig = {
  chunkSize: parseInt(process.env.MAX_CHUNK_SIZE || '1000'),
  chunkOverlap: parseInt(process.env.MAX_CHUNK_OVERLAP || '200'),
  maxExamples: parseInt(process.env.MAX_EXAMPLES || '5'),
  maxHints: parseInt(process.env.MAX_HINTS || '3'),
  defaultLanguages: ['typescript', 'javascript', 'python', 'java', 'c++', 'go', 'rust'],
  
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
    index: process.env.PINECONE_INDEX
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4'
  }
};

export const documentationConfig = {
  // Documentation types and their weights for ranking
  typeWeights: {
    hint: 1.2,
    example: 1.0,
    explanation: 0.8,
    syntax: 0.6
  },
  
  // Initial documentation sources
  sources: {
    mdn: 'https://developer.mozilla.org',
    typescript: 'https://www.typescriptlang.org/docs',
    react: 'https://react.dev',
    nodejs: 'https://nodejs.org/docs'
  },

  // Fallback patterns for different languages
  fallbackPatterns: {
    typescript: [
      { type: 'function', pattern: 'function\\s+([a-zA-Z_$][\\w$]*)\\s*\\(' },
      { type: 'class', pattern: 'class\\s+([a-zA-Z_$][\\w$]*)' },
      { type: 'interface', pattern: 'interface\\s+([a-zA-Z_$][\\w$]*)' },
      { type: 'type', pattern: 'type\\s+([a-zA-Z_$][\\w$]*)\\s*=' }
    ],
    javascript: [
      { type: 'function', pattern: 'function\\s+([a-zA-Z_$][\\w$]*)\\s*\\(' },
      { type: 'class', pattern: 'class\\s+([a-zA-Z_$][\\w$]*)' },
      { type: 'const', pattern: 'const\\s+([a-zA-Z_$][\\w$]*)\\s*=' }
    ]
  }
};