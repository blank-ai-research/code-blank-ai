import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import HintPopover from './HintPopover';
import { getDocumentation } from '@/utils/codeAnalysis';
import { Skeleton } from './ui/skeleton';
import { highlightCode, highlightInline } from '@/utils/syntaxHighlighting';

interface CodeLine {
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

interface CodeEditorProps {
  fileName: string;
  language: string;
  code: CodeLine[];
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  onChange?: (code: CodeLine[]) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ 
  fileName, 
  language, 
  code = [], 
  skillLevel = 'intermediate',
  onChange 
}) => {
  const [activeBlank, setActiveBlank] = useState<string | null>(null);
  const [hintPosition, setHintPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeHint, setActiveHint] = useState<any>(null);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize syntax highlighting
  useEffect(() => {
    const highlight = async () => {
      const highlighted = await Promise.all(
        code.map(line => highlightInline(line.content, language))
      );
      setHighlightedCode(highlighted);
    };
    highlight();
  }, [code, language]);

  const handleBlankClick = async (lineIndex: number, blank: any, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const editorRect = editorRef.current?.getBoundingClientRect();
    
    if (editorRect) {
      // Calculate optimal position for hint
      const spaceRight = window.innerWidth - (rect.right - editorRect.left);
      const spaceBelow = window.innerHeight - (rect.bottom - editorRect.top);
      
      // Position hint based on available space
      setHintPosition({
        top: spaceBelow > 300 ? rect.bottom - editorRect.top : rect.top - editorRect.top - 300,
        left: spaceRight > 400 ? rect.right - editorRect.left + 10 : rect.left - editorRect.left - 410
      });
    }
    
    setActiveBlank(blank.id);
    setIsLoadingHint(true);
    
    try {
      const enhancedHint = {...blank.hint};
      
      if (blank.hint.title) {
        const additionalDocs = await getDocumentation(
          blank.hint.title.toLowerCase().replace(/\s+/g, '-'),
          language
        );
        
        if (additionalDocs) {
          enhancedHint.docs = additionalDocs.description || enhancedHint.docs;
          enhancedHint.docLink = additionalDocs.docs_link;
          enhancedHint.examples = additionalDocs.examples || [enhancedHint.example];
        }
      }
      
      setActiveHint(enhancedHint);
    } catch (error) {
      console.error('Error fetching documentation:', error);
      setActiveHint(blank.hint);
    } finally {
      setIsLoadingHint(false);
    }
  };

  const closeHint = () => {
    setActiveBlank(null);
    setHintPosition(null);
    setActiveHint(null);
  };

  // Handle clicking outside to close hint
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        editorRef.current && 
        !editorRef.current.contains(event.target as Node) &&
        activeBlank
      ) {
        closeHint();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeBlank]);

  const renderLine = (line: CodeLine, index: number) => {
    if (!line.blanks || line.blanks.length === 0) {
      return (
        <div key={index} className="code-line group relative hover:bg-editor-line/30">
          <span className="code-line-number text-gray-500 select-none pr-4 border-r border-editor-gutter">
            {line.lineNumber}
          </span>
          <span 
            className="ml-4"
            dangerouslySetInnerHTML={{ __html: highlightedCode[index] || line.content }}
          />
        </div>
      );
    }

    let segments = [];
    let lastEnd = 0;

    line.blanks.forEach((blank, blankIndex) => {
      // Add highlighted text before blank
      if (blank.start > lastEnd) {
        const beforeText = line.content.substring(lastEnd, blank.start);
        segments.push(
          <span 
            key={`text-${blankIndex}`}
            dangerouslySetInnerHTML={{ 
              __html: highlightedCode[index]?.substring(lastEnd, blank.start) || beforeText 
            }}
          />
        );
      }

      // Add the blank with enhanced styling
      segments.push(
        <span 
          key={`blank-${blank.id}`}
          className={cn(
            "code-blank relative cursor-pointer rounded transition-all duration-200",
            "before:absolute before:inset-0 before:bg-editor-blank before:opacity-20 before:rounded",
            activeBlank === blank.id 
              ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 -mx-2" 
              : "hover:bg-yellow-500/10 hover:text-yellow-700 dark:hover:text-yellow-300"
          )}
          onClick={(e) => handleBlankClick(index, blank, e)}
          title="Click to see hint"
        >
          {line.content.substring(blank.start, blank.end)}
        </span>
      );

      lastEnd = blank.end;
    });

    // Add remaining highlighted text
    if (lastEnd < line.content.length) {
      const afterText = line.content.substring(lastEnd);
      segments.push(
        <span 
          key="text-end"
          dangerouslySetInnerHTML={{ 
            __html: highlightedCode[index]?.substring(lastEnd) || afterText 
          }}
        />
      );
    }

    return (
      <div key={index} className="code-line group relative hover:bg-editor-line/30">
        <span className="code-line-number text-gray-500 select-none pr-4 border-r border-editor-gutter">
          {line.lineNumber}
        </span>
        <span className="ml-4">{segments}</span>
      </div>
    );
  };

  return (
    <div className="h-full relative border rounded-md overflow-hidden bg-editor" ref={editorRef}>
      <div className="px-3 py-2 border-b text-sm flex items-center justify-between bg-editor-gutter">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{fileName}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-editor-line text-white/80">
            {language.toUpperCase()}
          </span>
        </div>
        <span className="text-xs text-white/60">Mode: {skillLevel}</span>
      </div>
      
      <div className="editor-content h-[calc(100%-2.5rem)] overflow-auto p-4 font-mono text-sm leading-6 text-white/90">
        {code.length > 0 ? (
          code.map((line, index) => renderLine(line, index))
        ) : (
          <div className="p-4 text-gray-500">No code to display</div>
        )}
      </div>
      
      {activeBlank && hintPosition && (isLoadingHint || activeHint) && (
        <div 
          className="fixed z-50 animate-in fade-in-0 zoom-in-95"
          style={{ 
            position: 'absolute', 
            top: `${hintPosition.top}px`, 
            left: `${hintPosition.left}px`,
          }}
        >
          {isLoadingHint ? (
            <div className="bg-background border rounded-lg shadow-lg p-4 w-80 md:w-96">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-24 w-full mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <HintPopover hint={activeHint} onClose={closeHint} />
          )}
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
