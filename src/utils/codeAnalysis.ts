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

// Enhanced code analysis that combines regex patterns with Gemini API
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
  } catch (error) {
    console.error("Error in code analysis:", error);
    
    // Fallback to regex-only analysis if Gemini API fails
    return fallbackRegexAnalysis(code, language, userSkillLevel);
  }
};

// Gemini API integration for code analysis
async function analyzeWithGemini(code: string, language: string, userSkillLevel: string): Promise<any[]> {
  try {
    const GEMINI_API_KEY = "AIzaSyDdu5gj6baE7Q3ZEsUVnXfx4Zv-IsepZzI"; // This is a dummy API key
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
    
    // Construct the prompt for Gemini
    const prompt = `
      Analyze this ${language} code and identify educational opportunities where I should blank out code to create a fill-in-the-blank exercise.
      For a ${userSkillLevel} level developer, identify 3-5 important concepts or patterns that would be educational to blank out.
      
      For each blank, provide:
      1. The line number
      2. The start and end character positions
      3. A title for the concept
      4. Documentation explaining the concept
      5. Logic explaining why this code works this way
      6. An example of similar usage
      
      Code to analyze:
      \`\`\`${language}
      ${code}
      \`\`\`
      
      Return the analysis as a JSON array of objects with this structure:
      [
        {
          "lineNumber": number,
          "start": number,
          "end": number,
          "hint": {
            "title": string,
            "docs": string,
            "logic": string,
            "example": string
          }
        }
      ]
    `;
    
    // Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract and parse the JSON response from Gemini
    let jsonResult;
    try {
      const textResponse = data.candidates[0].content.parts[0].text;
      // Find the JSON part in the response (it might be wrapped in markdown code blocks)
      const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not find JSON in response");
      }
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      return [];
    }
    
    return jsonResult || [];
    
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Return empty array to fall back to regex approach
    return [];
  }
}

// Fallback to regex-only analysis when Gemini API fails
function fallbackRegexAnalysis(code: string, language: string, userSkillLevel: string): Promise<CodeLine[]> {
  return new Promise((resolve) => {
    const lines = code.split('\n');
    const result = [];
    
    // Basic patterns for code analysis
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
    
    // Process each line with regex patterns
    lines.forEach((lineContent, index) => {
      const lineNumber = index + 1;
      const codeLine = {
        lineNumber,
        content: lineContent,
        blanks: []
      };
      
      const languagePatterns = patterns[language] || patterns.javascript;
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

// Use Gemini API to retrieve more accurate documentation
async function retrieveDocsFromGemini(feature: string, language: string): Promise<any> {
  try {
    const GEMINI_API_KEY = "AIzaSyDdu5gj6baE7Q3ZEsUVnXfx4Zv-IsepZzI"; // This is a dummy API key
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
    
    const prompt = `
      Provide concise documentation for the "${feature}" feature in ${language}.
      Return a JSON object with this structure:
      {
        "syntax": "The syntax pattern for this feature",
        "description": "A concise description of how this feature works and when to use it",
        "docs_link": "A URL to the official documentation"
      }
    `;
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract and parse the JSON response
    let jsonResult;
    try {
      const textResponse = data.candidates[0].content.parts[0].text;
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not find JSON in response");
      }
    } catch (parseError) {
      return null;
    }
    
    return jsonResult;
    
  } catch (error) {
    console.error("Error calling Gemini API for documentation:", error);
    return null;
  }
}

// Fallback documentation when API fails
function fallbackDocumentation(feature: string, language: string): Promise<any> {
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      const documentationDB = {
        javascript: {
          'async/await': {
            syntax: 'async function name() { ... await promise; ... }',
            description: 'The async function declaration creates a binding of a new async function to a given name. The await keyword is permitted within the function body, enabling asynchronous, promise-based behavior.',
            docs_link: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function'
          },
          'try/catch': {
            syntax: 'try { ... } catch (error) { ... }',
            description: 'The try...catch statement marks a block of statements to try and specifies a response should an exception be thrown.',
            docs_link: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch'
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

// Generate code using Gemini API
async function generateWithGemini(prompt: string, language: string): Promise<string | null> {
  try {
    const GEMINI_API_KEY = "AIzaSyDdu5gj6baE7Q3ZEsUVnXfx4Zv-IsepZzI"; // This is a dummy API key
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
    
    const apiPrompt = `
      Generate ${language} code based on this request: "${prompt}"
      
      Requirements:
      - Code should be well-commented
      - Include example usage
      - Follow best practices for ${language}
      - Be concise but complete
      
      Return only the code, no explanations before or after.
    `;
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: apiPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Extract code from the response (remove any markdown code blocks)
    const codeResult = generatedText.replace(/```[\w]*\n/g, '').replace(/```$/g, '');
    
    return codeResult;
    
  } catch (error) {
    console.error("Error calling Gemini API for code generation:", error);
    return null;
  }
}

// Fallback sample code
function getSampleCode(prompt: string, language: string): Promise<string> {
  return new Promise((resolve) => {
    // Simulate API latency
    setTimeout(() => {
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
      
      resolve(sampleCode[language] || sampleCode.javascript);
    }, 1500);
  });
}
