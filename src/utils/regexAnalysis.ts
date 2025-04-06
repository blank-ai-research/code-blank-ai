
import { v4 as uuidv4 } from 'uuid';
import { CodeLine, codePatterns } from './types';

// Fallback to regex-only analysis when Gemini API fails
export function fallbackRegexAnalysis(code: string, language: string, userSkillLevel: string): Promise<CodeLine[]> {
  return new Promise((resolve) => {
    const lines = code.split('\n');
    const result = [];
    
    // Process each line with regex patterns
    lines.forEach((lineContent, index) => {
      const lineNumber = index + 1;
      const codeLine = {
        lineNumber,
        content: lineContent,
        blanks: []
      };
      
      const languagePatterns = codePatterns[language] || codePatterns.javascript;
      const blank_probability = userSkillLevel === 'beginner' ? 0.8 : 
                              userSkillLevel === 'intermediate' ? 0.6 : 0.4;
      
      languagePatterns.forEach((pattern) => {
        const matches = [...lineContent.matchAll(pattern.regex)];
        
        matches.forEach((match) => {
          if (Math.random() < blank_probability) {
            const start = match.index;
            const end = start + match[0].length;
            
            codeLine.blanks.push({
              id: uuidv4(),
              start,
              end,
              hint: {
                title: pattern.title,
                ...pattern.hint
              }
            });
          }
        });
      });
      
      if (codeLine.blanks.length === 0) {
        delete codeLine.blanks;
      }
      
      result.push(codeLine);
    });
    
    resolve(result);
  });
}
