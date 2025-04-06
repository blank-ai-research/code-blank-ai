
import React, { useState } from 'react';
import { X, Book, Code, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface HintPopoverProps {
  hint: {
    title: string;
    docs: string;
    logic?: string;
    example?: string;
  };
  onClose: () => void;
}

const HintPopover: React.FC<HintPopoverProps> = ({ hint, onClose }) => {
  return (
    <div className="hint-card w-80 md:w-96">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold">{hint.title}</h3>
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
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {hint.docs}
          </div>
        </TabsContent>
        
        {hint.logic && (
          <TabsContent value="logic" className="mt-2">
            <div className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded font-mono whitespace-pre-wrap">
              {hint.logic}
            </div>
          </TabsContent>
        )}
        
        {hint.example && (
          <TabsContent value="example" className="mt-2">
            <div className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded font-mono whitespace-pre-wrap">
              {hint.example}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default HintPopover;
