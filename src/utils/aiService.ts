import { ChatOpenAI } from '@langchain/openai';
import { DocumentationProcessor } from './documentationProcessor';
import { vectorStoreConfig } from './config';
import { ServiceManager } from './serviceManager';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { withTelemetry } from './telemetry';

const openai = new ChatOpenAI({
  openAIApiKey: vectorStoreConfig.openai.apiKey,
  modelName: vectorStoreConfig.openai.model,
  temperature: 0.2
});

const serviceManager = ServiceManager.getInstance();
const docProcessor = new DocumentationProcessor();

interface AnalysisResult {
  lineNumber: number;
  start: number;
  end: number;
  hint: {
    title: string;
    docs: string;
    logic: string;
    example?: string;
    docLink?: string;
  };
}

// Code analysis using OpenAI with context-aware blanks and fallbacks
export async function analyzeCode(
  code: string,
  language: string,
  userSkillLevel: string
): Promise<AnalysisResult[]> {
  if (!serviceManager.isInitialized()) {
    throw new Error('Services not initialized');
  }

  return withTelemetry('openai', async () => {
    try {
      // Get relevant documentation examples first
      const examples = await withTelemetry('documentation', () => 
        docProcessor.findExamples(code, language)
      );
      const hints = await withTelemetry('documentation', () =>
        docProcessor.findRelevantHints(code, language)
      );
      
      const contextualDocs = `
        Relevant code examples:
        ${examples.map(ex => ex.content).join('\n\n')}
        
        Documentation hints:
        ${hints.map(h => h.content).join('\n\n')}
      `;

      const response = await openai.invoke([
        new SystemMessage(`You are a code analysis expert. Create educational exercises by identifying concepts to blank out.
          Consider the user's skill level (${userSkillLevel}) when choosing what to blank.
          Focus on core logic, error handling, and important patterns.
          Here is relevant documentation context:
          ${contextualDocs}`),
        new HumanMessage(`Analyze this ${language} code and identify the most educational parts to blank out.
          Consider the context and skill level when choosing blanks.
          Return JSON array with structure matching AnalysisResult type.

          ${code}`)
      ]);

      const results = JSON.parse(response.content as string || '[]');
      return enrichAnalysisResults(results, language);
    } catch (error) {
      console.error("Error in code analysis:", error);
      if (!serviceManager.isServiceHealthy('vectorStore')) {
        // Fallback to basic analysis if vector store is down
        return basicAnalysis(code, language, userSkillLevel);
      }
      return [];
    }
  });
}

// Documentation retrieval using combined vector store and OpenAI
export async function retrieveDocumentation(feature: string, language: string) {
  if (!serviceManager.isInitialized()) {
    throw new Error('Services not initialized');
  }

  return withTelemetry('documentation', async () => {
    try {
      const docs = await docProcessor.getDocumentationForFeature(feature, language);
      
      if (docs) {
        // Enhance docs with OpenAI
        const response = await withTelemetry('openai', async () => {
          const aiResponse = await openai.invoke([
            new SystemMessage(`You are a documentation expert. Enhance and structure this documentation:
              ${docs.explanation}`),
            new HumanMessage(`Enhance documentation for ${feature} in ${language}. Return JSON:
              {
                syntax: string,
                description: string,
                docs_link: string,
                examples: string[]
              }`)
          ]);
          return aiResponse;
        });

        const enhancedDocs = JSON.parse(response.content as string || '{}');
        return {
          ...enhancedDocs,
          examples: [...(enhancedDocs.examples || []), ...(docs.examples || [])]
        };
      }

      // Fallback to pure OpenAI if no vector docs
      return generateBasicDocumentation(feature, language);
    } catch (error) {
      console.error("Error retrieving documentation:", error);
      if (!serviceManager.isServiceHealthy('vectorStore')) {
        return generateBasicDocumentation(feature, language);
      }
      return {
        description: 'Documentation temporarily unavailable.',
        syntax: 'Not available'
      };
    }
  });
}

// Code generation with context-aware examples
export async function generateCode(prompt: string, language: string): Promise<string> {
  if (!serviceManager.isInitialized()) {
    throw new Error('Services not initialized');
  }

  return withTelemetry('openai', async () => {
    try {
      const examples = await withTelemetry('documentation', () =>
        docProcessor.findExamples(prompt, language)
      );
      const context = examples.map(ex => ex.content).join('\n\n');

      const response = await openai.invoke([
        new SystemMessage(`You are a ${language} expert. Generate well-documented, production-ready code.
          Use these examples for reference:
          ${context}
          Include error handling and follow best practices.
          Add comments explaining complex logic to help users learn.`),
        new HumanMessage(prompt)
      ]);

      return response.content as string || `// Failed to generate code for: ${prompt}`;
    } catch (error) {
      console.error("Error generating code:", error);
      if (!serviceManager.isServiceHealthy('vectorStore')) {
        return generateBasicCode(prompt, language);
      }
      return `// Failed to generate code for: ${prompt}`;
    }
  });
}

// Private helper functions stay the same but wrapped with telemetry
async function enrichAnalysisResults(
  results: AnalysisResult[],
  language: string
): Promise<AnalysisResult[]> {
  return withTelemetry('documentation', async () => {
    return Promise.all(results.map(async (result) => {
      const hints = await docProcessor.findRelevantHints(result.hint.title, language);
      const examples = await docProcessor.findExamples(result.hint.title, language);

      return {
        ...result,
        hint: {
          ...result.hint,
          docLink: hints[0]?.metadata.source,
          example: examples[0]?.content || result.hint.example
        }
      };
    }));
  });
}

async function basicAnalysis(
  code: string,
  language: string,
  userSkillLevel: string
): Promise<AnalysisResult[]> {
  return withTelemetry('openai', async () => {
    try {
      const response = await openai.invoke([
        new SystemMessage("Analyze code to create educational blanks. Focus on basic patterns."),
        new HumanMessage(`Create basic blanks for this ${language} code for a ${userSkillLevel} developer.

        ${code}`)
      ]);

      return JSON.parse(response.content as string || '[]');
    } catch (error) {
      console.error("Error in basic analysis:", error);
      return [];
    }
  });
}

async function generateBasicDocumentation(feature: string, language: string) {
  return withTelemetry('openai', async () => {
    try {
      const response = await openai.invoke([
        new SystemMessage("Generate basic programming documentation with examples."),
        new HumanMessage(`Provide basic documentation for ${feature} in ${language}`)
      ]);

      return JSON.parse(response.content as string || '{}');
    } catch (error) {
      console.error("Error generating basic documentation:", error);
      return {
        description: 'Documentation temporarily unavailable.',
        syntax: 'Not available'
      };
    }
  });
}

async function generateBasicCode(prompt: string, language: string): Promise<string> {
  return withTelemetry('openai', async () => {
    try {
      const response = await openai.invoke([
        new SystemMessage(`Generate basic ${language} code with comments.`),
        new HumanMessage(prompt)
      ]);

      return response.content as string || `// Failed to generate code`;
    } catch (error) {
      console.error("Error generating basic code:", error);
      return `// Failed to generate code for: ${prompt}`;
    }
  });
}
