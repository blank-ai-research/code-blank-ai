
import { v4 as uuidv4 } from 'uuid';
import { CodeLine, documentationDB, sampleCode } from './types';
import { analyzeWithGemini, retrieveDocsFromGemini, generateWithGemini } from './aiService';
import { fallbackRegexAnalysis } from './regexAnalysis';

// Enhanced code analysis that combines regex patterns with Gemini API
export const analyzeCodeForBlanks = async (code: string, language: string, userSkillLevel = 'intermediate'): Promise<CodeLine[]> => {
  const lines = code.split('\n');
  const result = [];

  try {
    // Use Gemini API for blank generation
    const llmBlanks = await analyzeWithGemini(code, language, userSkillLevel);
    
    // Process each line combining regex and LLM approaches
    lines.forEach((lineContent, index) => {
      const lineNumber = index + 1;
      const codeLine = {
        lineNumber,
        content: lineContent,
        blanks: []
      };

      // Get Gemini API suggestions for this specific line
      const llmLineBlanks = llmBlanks.filter(blank => 
        blank.lineNumber === lineNumber
      );
      
      // Add Gemini-suggested blanks
      if (llmLineBlanks.length > 0) {
        codeLine.blanks = llmLineBlanks.map(blank => ({
          id: uuidv4(),
          start: blank.start,
          end: blank.end,
          hint: blank.hint
        }));
      } 

      // If no blanks were found, delete the blanks property
      if (codeLine.blanks.length === 0) {
        delete codeLine.blanks;
      }
      
      result.push(codeLine);
    });

    return result;
  } catch (error) {
    console.error("Error in code analysis:", error);
    
    // Fallback to regex-only analysis if Gemini API fails
    return fallbackRegexAnalysis(code, language, userSkillLevel);
  }
};

// Retrieve documentation for specific language features
export async function retrieveDocumentation(feature: string, language: string): Promise<any> {
  try {
    // Try to get documentation from Gemini API first
    const docs = await retrieveDocsFromGemini(feature, language);
    if (docs) return docs;
    
    // Fallback to hardcoded documentation
    return fallbackDocumentation(feature, language);
  } catch (error) {
    console.error("Error retrieving documentation:", error);
    return fallbackDocumentation(feature, language);
  }
}

// Fallback documentation when API fails
function fallbackDocumentation(feature: string, language: string): Promise<any> {
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      const languageDocs = documentationDB[language] || documentationDB.javascript;
      resolve(languageDocs[feature] || {
        description: 'Documentation not found for this feature.',
        syntax: 'Not available'
      });
    }, 300);
  });
}

// Mock function to simulate AI code generation
export const generateCodeFromPrompt = async (prompt: string, language: string): Promise<string> => {
  try {
    // Attempt to use Gemini API for code generation
    const generatedCode = await generateWithGemini(prompt, language);
    if (generatedCode) return generatedCode;
    
    // Fallback to sample code if API fails
    return getSampleCode(prompt, language);
  } catch (error) {
    console.error("Error generating code:", error);
    return getSampleCode(prompt, language);
  }
};

// Fallback sample code
function getSampleCode(prompt: string, language: string): Promise<string> {
  return new Promise((resolve) => {
    // Simulate API latency
    setTimeout(() => {
      // Replace ${prompt} placeholder with actual prompt
      const templateCode = sampleCode[language] || sampleCode.javascript;
      const actualCode = templateCode.replace(/\${prompt}/g, prompt);
      resolve(actualCode);
    }, 300);
  });
}
