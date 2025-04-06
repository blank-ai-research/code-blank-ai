
import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import Sidebar from '@/components/Sidebar';
import FileExplorer from '@/components/FileExplorer';
import CodeEditor from '@/components/CodeEditor';
import PromptInput from '@/components/PromptInput';
import { 
  mockRepoFiles, 
  findFileById, 
  FileItem, 
  detectLanguage 
} from '@/utils/fileSystem';
import { 
  analyzeCodeForBlanks, 
  generateCodeFromPrompt, 
  CodeLine 
} from '@/utils/codeAnalysis';

const Index = () => {
  const [sidebarTab, setSidebarTab] = useState('explorer');
  const [files] = useState(mockRepoFiles);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [codeLines, setCodeLines] = useState<CodeLine[]>([]);
  const [userSkillLevel, setUserSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [repoAnalyzed, setRepoAnalyzed] = useState(false);
  const { toast } = useToast();

  // Simulate initial repository analysis
  useEffect(() => {
    const analyzeRepo = async () => {
      // Simulate analysis delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Analysis Complete",
        description: "Repository structure and language detection complete!",
      });
      
      setRepoAnalyzed(true);
      
      // Select the first file to display by default
      const firstFile = findFileById('app.tsx');
      if (firstFile) {
        handleSelectFile(firstFile);
      }
    };
    
    analyzeRepo();
  }, []);

  const handleSelectFile = (file: FileItem) => {
    if (file.type !== 'file') return;
    
    setSelectedFile(file);
    
    // Convert file content to code lines with blanks
    if (file.content) {
      const analyzedCode = analyzeCodeForBlanks(file.content, file.language || 'plaintext', userSkillLevel);
      setCodeLines(analyzedCode);
    }
  };

  const handleTabChange = (tab: string) => {
    setSidebarTab(tab);
  };

  const handleChangeSkillLevel = (level: 'beginner' | 'intermediate' | 'advanced') => {
    setUserSkillLevel(level);
    
    // Re-analyze current file with new skill level
    if (selectedFile?.content) {
      const analyzedCode = analyzeCodeForBlanks(
        selectedFile.content, 
        selectedFile.language || 'plaintext', 
        level
      );
      setCodeLines(analyzedCode);
    }
  };

  const handleSendPrompt = async (prompt: string) => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to generate code",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const language = selectedFile.language || detectLanguage(selectedFile.name);
      const generatedCode = await generateCodeFromPrompt(prompt, language);
      
      // Update file content
      if (selectedFile) {
        selectedFile.content = generatedCode;
        
        // Analyze the new code for blanks
        const analyzedCode = analyzeCodeForBlanks(generatedCode, language, userSkillLevel);
        setCodeLines(analyzedCode);
      }
      
      toast({
        title: "Code Generated",
        description: "AI-generated code with intelligent blanks has been added.",
      });
    } catch (error) {
      toast({
        title: "Generation Error",
        description: "Failed to generate code from prompt.",
        variant: "destructive"
      });
      console.error("Code generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="h-12 border-b flex items-center px-4 justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-bold">blank.ai</h1>
          <div className="h-5 border-l mx-4"></div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {selectedFile?.name || 'No file selected'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Skill Level:</span>
          <div className="flex border rounded-md overflow-hidden">
            <button
              onClick={() => handleChangeSkillLevel('beginner')}
              className={`px-3 py-1 text-xs ${
                userSkillLevel === 'beginner'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Beginner
            </button>
            <button
              onClick={() => handleChangeSkillLevel('intermediate')}
              className={`px-3 py-1 text-xs ${
                userSkillLevel === 'intermediate'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Intermediate
            </button>
            <button
              onClick={() => handleChangeSkillLevel('advanced')}
              className={`px-3 py-1 text-xs ${
                userSkillLevel === 'advanced'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Advanced
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar with icons */}
        <Sidebar activeTab={sidebarTab} onChangeTab={handleTabChange} />
        
        {/* Secondary sidebar with content */}
        <div className="w-64 border-r overflow-hidden">
          {sidebarTab === 'explorer' && (
            <FileExplorer 
              files={files}
              onSelectFile={handleSelectFile}
              selectedFileId={selectedFile?.id}
            />
          )}
        </div>
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedFile ? (
            <div className="flex-1 overflow-hidden">
              <CodeEditor 
                fileName={selectedFile.name}
                language={selectedFile.language || detectLanguage(selectedFile.name)}
                code={codeLines}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              {repoAnalyzed ? (
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">Welcome to blank.ai</h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    Select a file from the explorer to get started
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-t-blue-500 border-gray-300 mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">
                    Analyzing repository structure...
                  </p>
                </div>
              )}
            </div>
          )}
          
          <PromptInput 
            onSendPrompt={handleSendPrompt} 
            isGenerating={isGenerating}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
