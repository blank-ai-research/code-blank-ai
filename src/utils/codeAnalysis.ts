
import { v4 as uuidv4 } from 'uuid';

// Define CodeLine interface for export
export interface CodeLine {
  lineNumber: number;
  content: string;
  blanks?: Array<{
    id: string;
    start: number;
    end: number;
    hint: {
      title: string;
      docs: string;
      logic?: string;
      example?: string;
      docLink?: string;
    };
  }>;
}

// Enhanced code analysis that combines regex patterns with LLM-based analysis
export const analyzeCodeForBlanks = async (code: string, language: string, userSkillLevel = 'intermediate'): Promise<CodeLine[]> => {
  const lines = code.split('\n');
  const result = [];

  // Basic patterns as fallback
  const patterns = {
    javascript: [
      {
        regex: /\b(function)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*{/g,
        title: 'Function Declaration',
        hint: {
          docs: 'Function declarations define named functions. They are hoisted to the top of their scope.',
          logic: 'Function declarations start with the keyword "function" followed by a name, parameters in parentheses, and a body enclosed in curly braces.',
          example: 'function calculateTotal(price, quantity) {\n  return price * quantity;\n}'
        }
      },
      {
        regex: /\b(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*\(?([^;]+)(?:;|\)?)/g,
        title: 'Variable Declaration',
        hint: {
          docs: 'Variables are used to store data values. In modern JavaScript, prefer using "const" for values that won\'t change and "let" for values that will.',
          logic: 'Variable declarations use the keywords "const", "let", or "var" followed by a name and an optional initialization.',
          example: 'const price = 10;\nlet quantity = 5;'
        }
      },
      {
        regex: /\b(if|else if|while|for)\s*\(([^)]+)\)\s*{/g,
        title: 'Control Flow',
        hint: {
          docs: 'Control flow statements allow you to control the order in which statements are executed based on specified conditions.',
          logic: 'Control flow statements typically involve a condition expression in parentheses and a block of code to execute if the condition is met.',
          example: 'if (age >= 18) {\n  console.log("Adult");\n} else {\n  console.log("Minor");\n}'
        }
      }
    ],
    typescript: [
      {
        regex: /\b(interface|type)\s+([a-zA-Z0-9_]+)(?:<[^>]+>)?\s*(?:extends [^{]+)?\s*{/g,
        title: 'Type Definition',
        hint: {
          docs: 'TypeScript allows defining custom types or interfaces to enforce consistent object shapes.',
          logic: 'Types and interfaces define the shape of objects, specifying property names and their expected types.',
          example: 'interface User {\n  id: number;\n  name: string;\n  email?: string;\n}'
        }
      },
      {
        regex: /([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_<>[\]|&]+)/g,
        title: 'Type Annotation',
        hint: {
          docs: 'Type annotations specify the expected type of a variable, parameter, or return value.',
          logic: 'A colon followed by a type specification indicates the expected type of the preceding identifier.',
          example: 'function greet(name: string): string {\n  return `Hello, ${name}!`;\n}'
        }
      }
    ],
    python: [
      {
        regex: /\bdef\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?:->\s*[a-zA-Z0-9_[\]]+)?\s*:/g,
        title: 'Function Definition',
        hint: {
          docs: 'In Python, functions are defined using the "def" keyword, followed by the function name and parameters.',
          logic: 'Python functions can specify type hints for parameters and return values using the arrow syntax.',
          example: 'def calculate_total(price: float, quantity: int) -> float:\n    return price * quantity'
        }
      },
      {
        regex: /\bclass\s+([a-zA-Z0-9_]+)(?:\(([^)]*)\))?\s*:/g,
        title: 'Class Definition',
        hint: {
          docs: 'Classes in Python are defined using the "class" keyword and can inherit from other classes.',
          logic: 'A class serves as a blueprint for creating objects with shared methods and properties.',
          example: 'class Person:\n    def __init__(self, name):\n        self.name = name\n\n    def greet(self):\n        return f"Hello, {self.name}!"'
        }
      }
    ]
  };

  // LLM-based analysis for blank generation
  const llmBlanks = await analyzeLLM(code, language, userSkillLevel);
  
  // Process each line combining regex and LLM approaches
  lines.forEach((lineContent, index) => {
    const lineNumber = index + 1;
    const codeLine = {
      lineNumber,
      content: lineContent,
      blanks: []
    };

    // Get LLM suggestions for this specific line
    const llmLineBlanks = llmBlanks.filter(blank => 
      blank.lineNumber === lineNumber
    );
    
    // Add LLM-suggested blanks
    if (llmLineBlanks.length > 0) {
      codeLine.blanks = llmLineBlanks.map(blank => ({
        id: uuidv4(),
        start: blank.start,
        end: blank.end,
        hint: blank.hint
      }));
    } else {
      // Fallback to regex if LLM didn't find anything
      const languagePatterns = patterns[language] || patterns.javascript;
      const blank_probability = userSkillLevel === 'beginner' ? 0.8 : 
                               userSkillLevel === 'intermediate' ? 0.6 : 0.4;
      
      languagePatterns.forEach((pattern) => {
        const matches = [...lineContent.matchAll(pattern.regex)];
        
        matches.forEach((match) => {
          // Only blank out some instances based on skill level
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
    }

    // If no blanks were found, delete the blanks property
    if (codeLine.blanks.length === 0) {
      delete codeLine.blanks;
    }
    
    result.push(codeLine);
  });

  return result;
};

// LLM-based code analysis for more intelligent blank generation
async function analyzeLLM(code: string, language: string, userSkillLevel: string) {
  try {
    // In a production environment, this would call an actual LLM API
    // For demo purposes, we'll simulate an LLM response
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Parse code and identify educational opportunities
    const blanks = [];
    const lines = code.split('\n');
    
    // Analyze code structure to find teaching moments
    // This is a simplified simulation of what an LLM would return
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Look for complex logic patterns that would benefit from explanation
      if (line.includes('async') && line.includes('await')) {
        blanks.push({
          lineNumber,
          start: line.indexOf('async'),
          end: line.indexOf('await') + 5,
          hint: {
            title: 'Asynchronous Operation',
            docs: 'Async/await is a pattern for handling asynchronous operations more cleanly than callbacks or promises.',
            logic: 'The async keyword defines a function that returns a Promise. The await keyword pauses execution until the Promise resolves, making asynchronous code appear synchronous.',
            example: 'async function fetchData() {\n  const response = await fetch(\'api/data\');\n  return await response.json();\n}'
          }
        });
      }
      
      // Error handling patterns
      if (line.includes('try') || line.includes('catch')) {
        blanks.push({
          lineNumber,
          start: line.indexOf('try') >= 0 ? line.indexOf('try') : line.indexOf('catch'),
          end: line.indexOf('try') >= 0 ? line.indexOf('try') + 3 : line.indexOf('catch') + 5,
          hint: {
            title: 'Exception Handling',
            docs: 'Try/catch blocks allow you to handle errors gracefully in your code.',
            logic: 'Code in the try block is executed, and if it throws an exception, execution transfers to the catch block where the error can be handled.',
            example: 'try {\n  riskyOperation();\n} catch (error) {\n  console.error(\'Operation failed:\', error);\n}'
          }
        });
      }
      
      // API interactions (fetch, axios, etc.)
      if (line.includes('fetch(') || line.includes('axios.')) {
        blanks.push({
          lineNumber,
          start: line.includes('fetch(') ? line.indexOf('fetch(') : line.indexOf('axios.'),
          end: line.includes('fetch(') ? line.indexOf('fetch(') + 6 : line.indexOf('axios.') + 10,
          hint: {
            title: 'API Request',
            docs: 'Making HTTP requests is a common operation in web applications to communicate with servers.',
            logic: 'HTTP requests are asynchronous operations that return Promises. They need to be properly handled with async/await or .then() chains.',
            example: 'async function getData() {\n  try {\n    const response = await fetch(\'/api/data\');\n    if (!response.ok) throw new Error(\'Request failed\');\n    return await response.json();\n  } catch (error) {\n    console.error(\'Failed to fetch data:\', error);\n  }\n}'
          }
        });
      }
    });
    
    // Adjust blank frequency based on user skill level
    const skillFactor = userSkillLevel === 'beginner' ? 1 : 
                        userSkillLevel === 'intermediate' ? 0.7 : 0.4;
    
    return blanks.filter(() => Math.random() < skillFactor);
    
  } catch (error) {
    console.error('Error in LLM analysis:', error);
    return []; // Fall back to empty array on error
  }
}

// Retrieve documentation for specific language features
export async function retrieveDocumentation(feature: string, language: string) {
  // In a real implementation, this would query a documentation API or use RAG
  // For demo purposes, we'll return hardcoded documentation

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const documentationDB = {
    javascript: {
      'async/await': {
        syntax: 'async function name() { ... await promise; ... }',
        description: 'The async function declaration creates a binding of a new async function to a given name. The await keyword is permitted within the function body, enabling asynchronous, promise-based behavior.',
        mdn_link: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function'
      },
      'try/catch': {
        syntax: 'try { ... } catch (error) { ... }',
        description: 'The try...catch statement marks a block of statements to try and specifies a response should an exception be thrown.',
        mdn_link: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch'
      }
    },
    typescript: {
      'interface': {
        syntax: 'interface Name { property: type; }',
        description: 'Interfaces are used to define the shape of objects in TypeScript. They provide strong typing for object structures.',
        docs_link: 'https://www.typescriptlang.org/docs/handbook/interfaces.html'
      }
    }
  };
  
  const languageDocs = documentationDB[language] || documentationDB.javascript;
  return languageDocs[feature] || {
    description: 'Documentation not found for this feature.',
    syntax: 'Not available'
  };
}

// Mock function to simulate AI code generation
export const generateCodeFromPrompt = async (prompt: string, language: string): Promise<string> => {
  // In a real implementation, this would call an LLM API
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API latency
  
  const sampleCode = {
    javascript: `// Generated code based on prompt: "${prompt}"
function processData(data) {
  if (!Array.isArray(data)) {
    throw new Error('Input must be an array');
  }
  
  const results = data.map(item => {
    return {
      id: item.id,
      value: item.value * 2,
      processed: true
    };
  });
  
  return results.filter(item => item.value > 10);
}

// Example usage
const inputData = [
  { id: 1, value: 5 },
  { id: 2, value: 8 },
  { id: 3, value: 12 }
];

const processedData = processData(inputData);
console.log(processedData);`,

    typescript: `// Generated code based on prompt: "${prompt}"
interface DataItem {
  id: number;
  value: number;
}

interface ProcessedItem extends DataItem {
  processed: boolean;
}

function processData(data: DataItem[]): ProcessedItem[] {
  if (!Array.isArray(data)) {
    throw new Error('Input must be an array');
  }
  
  const results: ProcessedItem[] = data.map(item => {
    return {
      id: item.id,
      value: item.value * 2,
      processed: true
    };
  });
  
  return results.filter(item => item.value > 10);
}

// Example usage
const inputData: DataItem[] = [
  { id: 1, value: 5 },
  { id: 2, value: 8 },
  { id: 3, value: 12 }
];

const processedData = processData(inputData);
console.log(processedData);`,

    python: `# Generated code based on prompt: "${prompt}"
from typing import List, Dict, Any

def process_data(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not isinstance(data, list):
        raise TypeError('Input must be a list')
    
    results = []
    for item in data:
        processed_item = {
            'id': item['id'],
            'value': item['value'] * 2,
            'processed': True
        }
        results.append(processed_item)
    
    return [item for item in results if item['value'] > 10]

# Example usage
input_data = [
    {'id': 1, 'value': 5},
    {'id': 2, 'value': 8},
    {'id': 3, 'value': 12}
]

processed_data = process_data(input_data)
print(processed_data)`
  };
  
  return sampleCode[language] || sampleCode.javascript;
};
