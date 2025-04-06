
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

// Define documentation interface
export interface Documentation {
  syntax?: string;
  description?: string;
  docs_link?: string;
  mdn_link?: string;
}

// Language patterns for code analysis
export const codePatterns = {
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

// Fixed documentation for fallback
export const documentationDB = {
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

// Sample code for fallback
export const sampleCode = {
  javascript: `// Generated code based on prompt: "\${prompt}"
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

  typescript: `// Generated code based on prompt: "\${prompt}"
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

  python: `# Generated code based on prompt: "\${prompt}"
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
