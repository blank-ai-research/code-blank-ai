
import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface PromptInputProps {
  onSendPrompt: (prompt: string) => Promise<void>;
  isGenerating: boolean;
}

const PromptInput: React.FC<PromptInputProps> = ({ onSendPrompt, isGenerating }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    
    try {
      await onSendPrompt(prompt);
      setPrompt('');
    } catch (error) {
      console.error('Error sending prompt:', error);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="border-t p-3 bg-white dark:bg-gray-900 flex items-end gap-2"
    >
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ask blank.ai to generate code or explain concepts..."
        className="min-h-24 resize-none flex-1"
      />
      <Button 
        type="submit" 
        size="icon" 
        className="h-10 w-10" 
        disabled={!prompt.trim() || isGenerating}
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
};

export default PromptInput;
