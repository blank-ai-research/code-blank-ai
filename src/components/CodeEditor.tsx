
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import HintPopover from './HintPopover';

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
    };
  }>;
}

interface CodeEditorProps {
  fileName: string;
  language: string;
  code: CodeLine[];
  onChange?: (code: CodeLine[]) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ fileName, language, code, onChange }) => {
  const [activeBlank, setActiveBlank] = useState<string | null>(null);
  const [hintPosition, setHintPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeHint, setActiveHint] = useState<any>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleBlankClick = (lineIndex: number, blank: any, event: React.MouseEvent) => {
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
    setActiveHint(blank.hint);
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
            "code-blank",
            activeBlank === blank.id && "bg-blue-300 dark:bg-blue-800"
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

  return (
    <div className="h-full relative" ref={editorRef}>
      <div className="px-2 py-1 border-b text-sm flex items-center">
        <span className="font-medium">{fileName}</span>
        <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
          {language.toUpperCase()}
        </span>
      </div>
      <div className="editor-bg h-[calc(100%-2rem)] overflow-auto">
        {code.map((line, index) => renderLine(line, index))}
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
