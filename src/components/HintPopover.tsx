
import React from 'react';
import { X, Book, Code, FileCode, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

interface HintPopoverProps {
  hint: {
    title: string;
    docs: string;
    logic?: string;
    example?: string;
    docLink?: string;
  };
  onClose: () => void;
}

const HintPopover: React.FC<HintPopoverProps> = ({ hint, onClose }) => {
  return (
    <div className="hint-card w-80 md:w-96 bg-background border rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">{hint.title}</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <X size={16} />
        </button>
      </div>

      <Tabs defaultValue="docs">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="docs" className="flex items-center gap-1">
            <Book size={14} />
            <span>Docs</span>
          </TabsTrigger>
          {hint.logic && (
            <TabsTrigger value="logic" className="flex items-center gap-1">
              <Code size={14} />
              <span>Logic</span>
            </TabsTrigger>
          )}
          {hint.example && (
            <TabsTrigger value="example" className="flex items-center gap-1">
              <FileCode size={14} />
              <span>Example</span>
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="docs" className="mt-2">
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p>{hint.docs}</p>
            {hint.docLink && (
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs flex items-center gap-1"
                  asChild
                >
                  <a href={hint.docLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={12} />
                    View Documentation
                  </a>
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        
        {hint.logic && (
          <TabsContent value="logic" className="mt-2">
            <div className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded font-mono whitespace-pre-wrap">
              {hint.logic}
            </div>
          </TabsContent>
        )}
        
        {hint.example && (
          <TabsContent value="example" className="mt-2">
            <div className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded font-mono whitespace-pre-wrap">
              {hint.example}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default HintPopover;
