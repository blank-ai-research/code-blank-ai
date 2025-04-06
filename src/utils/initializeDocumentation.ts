import { DocumentationProcessor } from './documentationProcessor';
import { documentationConfig, vectorStoreConfig } from './config';
import type { DocMetadata } from './types';

interface LanguageDoc {
  content: string;
  source: string;
  type: DocMetadata['type'];
  topic?: string;
}

export class DocumentationInitializer {
  private docProcessor: DocumentationProcessor;

  constructor() {
    this.docProcessor = new DocumentationProcessor();
  }

  async initialize() {
    const docs: Array<{content: string, metadata: DocMetadata}> = [];

    // Load default documentation for each language
    for (const language of vectorStoreConfig.defaultLanguages) {
      const langDocs = await this.fetchLanguageDocumentation(language);
      docs.push(...langDocs.map(doc => ({
        content: doc.content,
        metadata: {
          language,
          source: doc.source,
          type: doc.type,
          topic: doc.topic
        }
      })));
    }

    // Process and store documentation
    await this.docProcessor.processDocumentation(docs);
    console.log('Documentation initialization complete');
  }

  private async fetchLanguageDocumentation(language: string): Promise<LanguageDoc[]> {
    const docs: LanguageDoc[] = [];
    const source = documentationConfig.sources[language] || documentationConfig.sources.mdn;
    
    try {
      // Here we would integrate with actual documentation APIs
      // For now, we'll use basic patterns and examples
      const patterns = documentationConfig.fallbackPatterns[language] || [];
      
      for (const pattern of patterns) {
        docs.push({
          content: `${pattern.type} pattern in ${language}: ${pattern.pattern}`,
          source: `${source}/patterns`,
          type: 'syntax',
          topic: pattern.type
        });

        // Add example for each pattern
        docs.push({
          content: this.generateExample(language, pattern.type),
          source: `${source}/examples`,
          type: 'example',
          topic: pattern.type
        });
      }

      return docs;
    } catch (error) {
      console.error(`Error fetching ${language} documentation:`, error);
      return [];
    }
  }

  private generateExample(language: string, type: string): string {
    // Basic examples for different types - would be replaced with real documentation
    const examples = {
      typescript: {
        function: 'function greet(name: string): string {\n  return `Hello, ${name}!`;\n}',
        class: 'class User {\n  constructor(public name: string) {}\n}',
        interface: 'interface UserData {\n  id: number;\n  name: string;\n}',
        type: 'type UserRole = "admin" | "user" | "guest";'
      },
      javascript: {
        function: 'function calculateTotal(prices) {\n  return prices.reduce((sum, price) => sum + price, 0);\n}',
        class: 'class Product {\n  constructor(name, price) {\n    this.name = name;\n    this.price = price;\n  }\n}',
        const: 'const MAX_ITEMS = 100;'
      }
    };

    return examples[language]?.[type] || 'Example not available';
  }
}