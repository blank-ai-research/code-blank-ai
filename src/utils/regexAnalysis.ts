import { v4 as uuidv4 } from 'uuid';
import { CodeLine } from './types';

// Enhanced regex patterns for code analysis
const patterns = {
  javascript: [
    {
      regex: /\b(function|const|let|var|class|interface|type)\s+([a-zA-Z0-9_]+)/g,
      title: 'Declaration',
      hint: {
        docs: 'Declarations create new named entities like functions, variables, classes, or types.',
        logic: 'Use descriptive names that reflect the purpose. Consider scope and mutability when choosing between const/let/var.',
        example: 'function calculateTotal(items) {\n  return items.reduce((sum, item) => sum + item.price, 0);\n}'
      }
    },
    {
      regex: /(try|catch|finally|throw)\s*{/g,
      title: 'Error Handling',
      hint: {
        docs: 'Error handling prevents application crashes and provides graceful failure recovery.',
        logic: 'Use try/catch to handle potential errors. Consider what errors might occur and how to handle them appropriately.',
        example: 'try {\n  await processData(input);\n} catch (error) {\n  logger.error(error);\n  throw new CustomError("Data processing failed");\n}'
      }
    },
    {
      regex: /\b(if|else|switch|for|while|do)\b/g,
      title: 'Control Flow',
      hint: {
        docs: 'Control flow determines the order in which code executes based on conditions or iterations.',
        logic: 'Choose the appropriate control structure. Consider edge cases and ensure all paths are handled.',
        example: 'if (user.isAdmin) {\n  showAdminPanel();\n} else if (user.isManager) {\n  showManagerView();\n} else {\n  showUserDashboard();\n}'
      }
    }
  ],
  typescript: [
    {
      regex: /<([^>]+)>|\b(type|interface)\s+([a-zA-Z0-9_]+)/g,
      title: 'Type System',
      hint: {
        docs: 'TypeScript\'s type system helps catch errors early and improves code maintainability.',
        logic: 'Define clear interfaces and types. Use generics when functionality can work with multiple types.',
        example: 'interface User<T> {\n  id: number;\n  data: T;\n  metadata: Record<string, unknown>;\n}'
      }
    }
  ],
  python: [
    {
      regex: /\bdef\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?:->|\:)/g,
      title: 'Function Definition',
      hint: {
        docs: 'Functions encapsulate reusable code blocks. Python supports type hints for better code clarity.',
        logic: 'Consider input validation, return types, and function purity.',
        example: 'def calculate_average(numbers: List[float]) -> float:\n    return sum(numbers) / len(numbers)'
      }
    }
  ]
};

// Fallback analysis when AI fails
export const fallbackRegexAnalysis = (
  code: string | string[], 
  language: string,
  userSkillLevel: string
): CodeLine[] => {
  const lines = Array.isArray(code) ? code : code.split('\n');
  const languagePatterns = patterns[language] || patterns.javascript;
  
  return lines.map((content, index) => {
    const lineNumber = index + 1;
    const blanks = [];

    // Apply each pattern to the line
    for (const pattern of languagePatterns) {
      const matches = [...content.matchAll(pattern.regex)];
      
      // Create blanks based on skill level and matches
      matches.forEach(match => {
        // Skip basic patterns for advanced users
        if (userSkillLevel === 'advanced' && pattern.title === 'Declaration') {
          return;
        }

        blanks.push({
          id: uuidv4(),
          start: match.index!,
          end: match.index! + match[0].length,
          hint: {
            title: pattern.title,
            docs: pattern.hint.docs,
            logic: pattern.hint.logic,
            example: pattern.hint.example
          }
        });
      });
    }

    return {
      lineNumber,
      content,
      ...(blanks.length > 0 && { blanks })
    };
  });
};
