import React, { useState, useEffect } from 'react';
import { X, Book, Code, FileCode, ExternalLink, Copy, Check, RefreshCcw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { highlightInline } from '@/utils/syntaxHighlighting';
import { ServiceManager } from '@/utils/serviceManager';
import { DocumentationProcessor } from '@/utils/documentationProcessor';
import { useHintCache } from '@/hooks/useHintCache';
import { withTelemetry } from '@/utils/telemetry';
import { withRateLimit } from '@/utils/rateLimit';
import { codePatterns } from '@/utils/types';

interface HintProps {
  title: string;
  docs: string;
  logic?: string;
  examples?: string[];
  docLink?: string;
  documentation?: string;
}

interface HintPopoverProps {
  hint: HintProps;
  onClose: () => void;
  language?: string;
}

interface CachedHint {
  highlightedExamples: string[];
  additionalExamples: string[];
  documentation?: string;
}

const HintPopover: React.FC<HintPopoverProps> = ({ hint, onClose, language = 'typescript' }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [highlightedExamples, setHighlightedExamples] = useState<string[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [additionalExamples, setAdditionalExamples] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const hintCache = useHintCache<CachedHint>();

  useEffect(() => {
    const loadExamples = async () => {
      const cacheKey = `${hint.title}-${language}`;
      const cached = hintCache.get(cacheKey);

      if (cached) {
        setHighlightedExamples(cached.highlightedExamples);
        setAdditionalExamples(cached.additionalExamples);
        return;
      }

      if (hint.examples) {
        try {
          const highlighted = await withRateLimit(
            'documentation',
            () => withTelemetry('documentation', async () => {
              return Promise.all(hint.examples!.map(ex => highlightInline(ex, language)));
            }),
            async () => {
              const patterns = codePatterns[language as keyof typeof codePatterns] || [];
              const pattern = patterns.find(p => p.title === hint.title);
              return pattern ? [await highlightInline(pattern.hint.example || '', language)] : [];
            }
          );

          setHighlightedExamples(highlighted);
          hintCache.set(cacheKey, {
            highlightedExamples: highlighted,
            additionalExamples: [],
            documentation: hint.documentation
          });
        } catch (err) {
          setError('Failed to load examples. Please try again later.');
          console.error('Error loading examples:', err);
        }
      }
    };

    loadExamples();
  }, [hint.examples, language, hint.title, hintCache]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const loadMoreExamples = async () => {
    if (!ServiceManager.getInstance().isInitialized()) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const docProcessor = new DocumentationProcessor();
      const moreExamples = await withRateLimit(
        'documentation',
        () => withTelemetry('documentation', () => 
          docProcessor.findExamples(hint.title, language)
        ),
        async () => {
          const patterns = codePatterns[language as keyof typeof codePatterns] || [];
          const pattern = patterns.find(p => p.title === hint.title);
          return pattern ? [{ content: pattern.hint.example || '' }] : [];
        }
      );
      
      const newExamples = moreExamples
        .map(ex => ex.content)
        .filter(ex => !hint.examples?.includes(ex));

      if (newExamples.length > 0) {
        const highlighted = await withRateLimit(
          'documentation',
          () => withTelemetry('documentation', () =>
            Promise.all(newExamples.map(ex => highlightInline(ex, language)))
          ),
          async () => newExamples
        );
        
        setAdditionalExamples(highlighted);

        const cacheKey = `${hint.title}-${language}`;
        const cached = hintCache.get(cacheKey);
        if (cached) {
          hintCache.set(cacheKey, {
            ...cached,
            additionalExamples: highlighted
          });
        }
      }
    } catch (error) {
      console.error('Error loading more examples:', error);
      setError('Failed to load additional examples. Please try again later.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="hint-card w-96 md:w-[480px] bg-background border rounded-lg shadow-lg">
      <div className="p-4 border-b">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg text-foreground">{hint.title}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="docs" className="p-4">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <Book className="h-4 w-4" />
            <span>Docs</span>
          </TabsTrigger>
          <TabsTrigger value="logic" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span>Logic</span>
          </TabsTrigger>
          <TabsTrigger value="examples" className="flex items-center gap-2">
            <FileCode className="h-4 w-4" />
            <span>Examples</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="docs" className="space-y-4">
          <div className="prose dark:prose-invert max-w-none">
            {hint.documentation ? (
              <div dangerouslySetInnerHTML={{ __html: hint.documentation }} />
            ) : (
              <p>{hint.docs}</p>
            )}
          </div>
          {hint.docLink && (
            <a
              href={hint.docLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 mt-2"
            >
              <ExternalLink className="h-4 w-4" />
              Read more in documentation
            </a>
          )}
        </TabsContent>

        <TabsContent value="logic" className="space-y-4">
          <div className="prose dark:prose-invert max-w-none">
            <p>{hint.logic}</p>
          </div>
        </TabsContent>

        <TabsContent value="examples" className="space-y-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {[...highlightedExamples, ...additionalExamples].map((example, index) => (
              <div key={index} className="relative group">
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const sourceExample = index < (hint.examples?.length || 0)
                        ? hint.examples![index]
                        : additionalExamples[index - (hint.examples?.length || 0)];
                      handleCopy(sourceExample, `example-${index}`);
                    }}
                  >
                    {copied === `example-${index}` ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <pre className="p-4 bg-zinc-950 rounded-lg overflow-x-auto">
                  <code
                    dangerouslySetInnerHTML={{ __html: example }}
                    className="text-sm"
                  />
                </pre>
              </div>
            ))}

            {ServiceManager.getInstance().isInitialized() && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={loadMoreExamples}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                    Loading more examples...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Load more examples
                  </>
                )}
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HintPopover;
