import { v4 as uuidv4 } from 'uuid';
import { CodeLine } from './types';
import { analyzeCode, retrieveDocumentation } from './aiService';
import { fallbackRegexAnalysis } from './regexAnalysis';
import { ServiceManager } from './serviceManager';
import { DocumentationProcessor } from './documentationProcessor';

// Get singleton instances
const serviceManager = ServiceManager.getInstance();

export const analyzeCodeForBlanks = async (
  code: string, 
  language: string, 
  userSkillLevel = 'intermediate'
): Promise<CodeLine[]> => {
  if (!serviceManager.isInitialized()) {
    throw new Error('Services not initialized');
  }

  const lines = code.split('\n');
  const result = [];

  try {
    // Get AI-suggested blanks
    const aiBlanks = await analyzeCode(code, language, userSkillLevel);
    const docProcessor = new DocumentationProcessor();
    
    // Process each line combining AI and regex approaches
    for (const [index, lineContent] of lines.entries()) {
      const lineNumber = index + 1;
      const codeLine = {
        lineNumber,
        content: lineContent,
        blanks: []
      };

      // Get AI-suggested blanks for this line
      const aiLineBlanks = aiBlanks.filter(blank => 
        blank.lineNumber === lineNumber
      );
      
      if (aiLineBlanks.length > 0) {
        const enhancedBlanks = await Promise.all(
          aiLineBlanks.map(async blank => {
            // Get relevant documentation and examples
            const [hints, examples] = await Promise.all([
              docProcessor.findRelevantHints(blank.hint.title, language),
              docProcessor.findExamples(blank.hint.title, language)
            ]);

            // Combine AI hints with vector-based documentation
            const enhancedHint = {
              title: blank.hint.title,
              docs: blank.hint.docs,
              logic: blank.hint.logic,
              examples: examples.map(ex => ex.content),
              documentation: hints
                .map(h => h.content)
                .join('\n\n'),
              docLink: hints[0]?.metadata.source
            };

            return {
              id: uuidv4(),
              start: blank.start,
              end: blank.end,
              hint: enhancedHint
            };
          })
        );

        codeLine.blanks = enhancedBlanks;
      } 

      // If no AI blanks were found, try regex patterns with documentation
      if (codeLine.blanks.length === 0) {
        const regexBlanks = fallbackRegexAnalysis([lineContent], language, userSkillLevel);
        if (regexBlanks[0]?.blanks) {
          // Enhance regex blanks with documentation
          const enhancedRegexBlanks = await Promise.all(
            regexBlanks[0].blanks.map(async blank => {
              const hints = await docProcessor.findRelevantHints(
                blank.hint.title,
                language
              );

              return {
                ...blank,
                hint: {
                  ...blank.hint,
                  documentation: hints
                    .map(h => h.content)
                    .join('\n\n'),
                  docLink: hints[0]?.metadata.source
                }
              };
            })
          );

          codeLine.blanks = enhancedRegexBlanks;
        }
      }

      if (codeLine.blanks.length === 0) {
        delete codeLine.blanks;
      }
      
      result.push(codeLine);
    }

    return result;
  } catch (error) {
    console.error("Error in code analysis:", error);
    return fallbackRegexAnalysis(code, language, userSkillLevel);
  }
};

export const getDocumentation = async (feature: string, language: string) => {
  if (!serviceManager.isInitialized()) {
    throw new Error('Services not initialized');
  }

  try {
    const docProcessor = new DocumentationProcessor();
    const docs = await docProcessor.getDocumentationForFeature(feature, language);
    
    if (docs) {
      return {
        description: docs.explanation,
        docs_link: docs.source,
        examples: docs.examples
      };
    }

    // Fallback to OpenAI retrieval if no docs found
    const aiDocs = await retrieveDocumentation(feature, language);
    return aiDocs;
  } catch (error) {
    console.error("Error retrieving documentation:", error);
    return {
      description: 'Documentation temporarily unavailable.',
      syntax: 'Not available'
    };
  }
};

export const generateCodeFromPrompt = async (prompt: string, language: string): Promise<string> => {
  if (!serviceManager.isInitialized()) {
    throw new Error('Services not initialized');
  }

  try {
    const docProcessor = new DocumentationProcessor();
    const examples = await docProcessor.findExamples(prompt, language);
    
    if (examples.length > 0) {
      // Use examples as context for better generation
      const enhancedPrompt = `
        Here are some relevant examples:
        ${examples.map(ex => ex.content).join('\n\n')}
        
        Using these examples as reference, generate code for: ${prompt}
      `;

      const result = await analyzeCode(enhancedPrompt, language, 'intermediate');
      return Array.isArray(result) ? result.map(r => r.content).join('\n') : String(result);
    }
    
    const result = await analyzeCode(prompt, language, 'intermediate');
    return Array.isArray(result) ? result.map(r => r.content).join('\n') : String(result);
  } catch (error) {
    console.error("Error generating code:", error);
    return `// Failed to generate code for: ${prompt}`;
  }
};
