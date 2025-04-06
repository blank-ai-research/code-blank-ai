import { useEffect, useState } from 'react';
import './App.css';
import CodeEditor from './components/CodeEditor';
import Sidebar from './components/Sidebar';
import ServiceHealth from './components/ServiceHealth';
import { ServiceManager } from './utils/serviceManager';
import { CodeLine } from './utils/types';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('editor');
  const [currentFile, setCurrentFile] = useState({
    name: 'untitled.ts',
    language: 'typescript',
    code: [
      {
        lineNumber: 1,
        content: '// Start coding here...'
      }
    ] as CodeLine[]
  });

  useEffect(() => {
    const initializeServices = async () => {
      try {
        await ServiceManager.getInstance().initialize();
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize services:', err);
        setError('Failed to initialize services. Please try again later.');
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      ServiceManager.getInstance().shutdown();
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Initializing services...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />
      <main className="flex-1 overflow-auto">
        <CodeEditor
          fileName={currentFile.name}
          language={currentFile.language}
          code={currentFile.code}
        />
      </main>
      <ServiceHealth />
    </div>
  );
}

export default App;
