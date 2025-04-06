
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import HintPopover from './HintPopover';
import { retrieveDocumentation } from '@/utils/codeAnalysis';

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
  onChange?: (code: CodeLine[]) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ fileName, language, code = [], onChange }) => {
  const [activeBlank, setActiveBlank] = useState<string | null>(null);
  const [hintPosition, setHintPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeHint, setActiveHint] = useState<any>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleBlankClick = async (lineIndex: number, blank: any, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const editorRect = editorRef.current?.getBoundingClientRect();
    
    if (editorRect) {
      // Position hint to the right of the blank
      setHintPosition({
        top: rect.top - editorRect.top,
        left: rect.right - editorRect.left + 10
      });
    }
    
    setActiveBlank(blank.id);
    
    // Enhanced hint with retrieved documentation if possible
    let enhancedHint = {...blank.hint};
    
    try {
      // Try to get more detailed documentation
      if (blank.hint.title) {
        const docKey = blank.hint.title.toLowerCase().replace(/\s+/g, '-');
        const additionalDocs = await retrieveDocumentation(docKey, language);
        
        if (additionalDocs) {
          enhancedHint = {
            ...enhancedHint,
            docs: additionalDocs.description || enhancedHint.docs,
            docLink: additionalDocs.mdn_link || additionalDocs.docs_link
          };
        }
      }
    } catch (error) {
      console.error('Error fetching additional documentation:', error);
    }
    
    setActiveHint(enhancedHint);
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
        <div key={index} className="code-line">
          <span className="code-line-number">{line.lineNumber}</span>
          <span>{line.content}</span>
        </div>
      );
    }

    let segments = [];
    let lastEnd = 0;

    line.blanks.forEach((blank, blankIndex) => {
      // Add text before blank
      if (blank.start > lastEnd) {
        segments.push(
          <span key={`text-${blankIndex}`}>
            {line.content.substring(lastEnd, blank.start)}
          </span>
        );
      }

      // Add the blank
      segments.push(
        <span 
          key={`blank-${blank.id}`}
          className={cn(
            "code-blank cursor-pointer px-1 rounded",
            activeBlank === blank.id 
              ? "bg-blue-300 dark:bg-blue-800" 
              : "bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-800/40"
          )}
          onClick={(e) => handleBlankClick(index, blank, e)}
        >
          {line.content.substring(blank.start, blank.end)}
        </span>
      );

      lastEnd = blank.end;
    });

    // Add any remaining text
    if (lastEnd < line.content.length) {
      segments.push(
        <span key="text-end">
          {line.content.substring(lastEnd)}
        </span>
      );
    }

    return (
      <div key={index} className="code-line">
        <span className="code-line-number">{line.lineNumber}</span>
        {segments}
      </div>
    );
  };

  // Ensure code is an array before trying to map over it
  const codeArray = Array.isArray(code) ? code : [];

  return (
    <div className="h-full relative border rounded-md overflow-hidden" ref={editorRef}>
      <div className="px-3 py-2 border-b text-sm flex items-center bg-muted/40">
        <span className="font-medium">{fileName}</span>
        <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
          {language.toUpperCase()}
        </span>
      </div>
      <div className="editor-bg h-[calc(100%-2.5rem)] overflow-auto p-1 font-mono text-sm">
        {codeArray.length > 0 ? (
          codeArray.map((line, index) => renderLine(line, index))
        ) : (
          <div className="p-4 text-gray-500">No code to display</div>
        )}
      </div>
      
      {activeBlank && hintPosition && activeHint && (
        <div 
          style={{ 
            position: 'absolute', 
            top: `${hintPosition.top}px`, 
            left: `${hintPosition.left}px`,
            zIndex: 10
          }}
        >
          <HintPopover hint={activeHint} onClose={closeHint} />
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
