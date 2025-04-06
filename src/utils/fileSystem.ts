
export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  language?: string;
  content?: string;
  children?: FileItem[];
  isOpen?: boolean;
  path?: string;
}

// This is a mock file system that simulates a repository structure
export const mockRepoFiles: FileItem[] = [
  {
    id: 'root',
    name: 'project-root',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'src',
        name: 'src',
        type: 'folder',
        children: [
          {
            id: 'components',
            name: 'components',
            type: 'folder',
            children: [
              {
                id: 'app.tsx',
                name: 'App.tsx',
                type: 'file',
                language: 'typescript',
                content: `import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { useFetchData } from '../hooks/useFetchData';
import { DataContext } from '../contexts/DataContext';
import { UserType } from '../types';

const App: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const { data, loading, error } = useFetchData<UserType>('/api/user');

  React.useEffect(() => {
    if (data && !error) {
      setUser(data);
    }
  }, [data, error]);

  return (
    <DataContext.Provider value={{ user, setUser }}>
      <div className="app-container">
        <Header />
        <div className="main-content">
          <Sidebar />
          <Dashboard />
        </div>
      </div>
    </DataContext.Provider>
  );
};

export default App;`
              },
              {
                id: 'header.tsx',
                name: 'Header.tsx',
                type: 'file',
                language: 'typescript',
                content: `import React from 'react';
import { Logo } from './Logo';
import { UserMenu } from './UserMenu';
import { useDataContext } from '../hooks/useDataContext';

export const Header: React.FC = () => {
  const { user } = useDataContext();
  
  return (
    <header className="header">
      <Logo />
      <div className="header-right">
        {user ? (
          <UserMenu user={user} />
        ) : (
          <button className="login-button">Log in</button>
        )}
      </div>
    </header>
  );
};`
              }
            ]
          },
          {
            id: 'hooks',
            name: 'hooks',
            type: 'folder',
            children: [
              {
                id: 'useFetchData.ts',
                name: 'useFetchData.ts',
                type: 'file',
                language: 'typescript',
                content: `import { useState, useEffect } from 'react';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useFetchData<T>(url: string): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(\`HTTP error! Status: \${response.status}\`);
        }
        const data = await response.json();
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    };

    fetchData();
    
    return () => {
      // Cleanup if needed
    };
  }, [url]);

  return state;
}`
              }
            ]
          },
          {
            id: 'types',
            name: 'types',
            type: 'folder',
            children: [
              {
                id: 'index.ts',
                name: 'index.ts',
                type: 'file',
                language: 'typescript',
                content: `export interface UserType {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  permissions: string[];
}

export interface DataContextType {
  user: UserType | null;
  setUser: (user: UserType | null) => void;
}

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';`
              }
            ]
          },
          {
            id: 'utils',
            name: 'utils',
            type: 'folder',
            children: [
              {
                id: 'api.ts',
                name: 'api.ts',
                type: 'file',
                language: 'typescript',
                content: `const API_URL = process.env.REACT_APP_API_URL || 'https://api.example.com';

export const fetchJson = async <T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> => {
  const url = endpoint.startsWith('http') ? endpoint : \`\${API_URL}\${endpoint}\`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    throw new Error(\`API error: \${response.status}\`);
  }

  return response.json();
};

export const get = <T>(endpoint: string): Promise<T> => {
  return fetchJson<T>(endpoint);
};

export const post = <T, D>(endpoint: string, data: D): Promise<T> => {
  return fetchJson<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};`
              }
            ]
          }
        ]
      },
      {
        id: 'api',
        name: 'api',
        type: 'folder',
        children: [
          {
            id: 'server.py',
            name: 'server.py',
            type: 'file',
            language: 'python',
            content: `from flask import Flask, jsonify, request
from flask_cors import CORS
import uuid
from typing import Dict, List, Any

app = Flask(__name__)
CORS(app)

# Mock user database
users = {
    "1": {"id": "1", "name": "John Doe", "email": "john@example.com", "role": "admin", "permissions": ["read", "write", "delete"]},
    "2": {"id": "2", "name": "Jane Smith", "email": "jane@example.com", "role": "user", "permissions": ["read", "write"]}
}

@app.route('/api/user', methods=['GET'])
def get_current_user():
    # In a real app, would use authentication
    return jsonify(users["1"])

@app.route('/api/users', methods=['GET'])
def get_all_users():
    return jsonify(list(users.values()))

@app.route('/api/users/<user_id>', methods=['GET'])
def get_user(user_id):
    if user_id in users:
        return jsonify(users[user_id])
    return jsonify({"error": "User not found"}), 404

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()
    if not data or not all(key in data for key in ["name", "email", "role"]):
        return jsonify({"error": "Invalid user data"}), 400
    
    user_id = str(uuid.uuid4())
    users[user_id] = {
        "id": user_id,
        "name": data["name"],
        "email": data["email"],
        "role": data["role"],
        "permissions": data.get("permissions", [])
    }
    return jsonify(users[user_id]), 201

if __name__ == '__main__':
    app.run(debug=True)`
          }
        ]
      },
      {
        id: 'package.json',
        name: 'package.json',
        type: 'file',
        language: 'javascript',
        content: `{
  "name": "sample-project",
  "version": "1.0.0",
  "description": "A sample project for blank.ai demo",
  "main": "index.js",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "devDependencies": {
    "@types/react": "^18.0.28",
    "@types/react-dom": "^18.0.11",
    "typescript": "^4.9.5"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}`
      },
      {
        id: 'readme.md',
        name: 'README.md',
        type: 'file',
        language: 'markdown',
        content: `# Sample Project

This is a sample project to demonstrate blank.ai functionality.

## Getting Started

1. Clone this repository
2. Install dependencies: \`npm install\`
3. Start the development server: \`npm start\`

## API Server

The API server is written in Python using Flask. To run it:

1. Navigate to the \`api\` directory
2. Install dependencies: \`pip install -r requirements.txt\`
3. Start the server: \`python server.py\`

## Project Structure

- \`/src\`: Frontend React code
  - \`/components\`: UI components
  - \`/hooks\`: Custom React hooks
  - \`/types\`: TypeScript type definitions
  - \`/utils\`: Utility functions
- \`/api\`: Backend server code

## Tech Stack

- React
- TypeScript
- Flask (Python)
`
      }
    ]
  }
];

// Helper function to find a file by its ID
export const findFileById = (
  id: string,
  files: FileItem[] = mockRepoFiles
): FileItem | null => {
  for (const file of files) {
    if (file.id === id) {
      return file;
    }
    
    if (file.children) {
      const found = findFileById(id, file.children);
      if (found) {
        return found;
      }
    }
  }
  
  return null;
};

// Helper function to detect language from file name
export const detectLanguage = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'js':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'jsx':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'rb':
      return 'ruby';
    case 'php':
      return 'php';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    case 'cs':
      return 'csharp';
    case 'c':
    case 'cpp':
    case 'h':
    case 'hpp':
      return 'cpp';
    case 'md':
      return 'markdown';
    case 'json':
      return 'json';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'scss':
    case 'sass':
      return 'scss';
    default:
      return 'plaintext';
  }
};
