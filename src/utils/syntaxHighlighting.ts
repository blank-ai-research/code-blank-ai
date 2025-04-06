import { getHighlighter, Highlighter } from 'shiki';

let highlighterInstance: Highlighter | null = null;

export async function initializeHighlighter() {
  if (!highlighterInstance) {
    highlighterInstance = await getHighlighter({
      themes: ['github-dark'],
      langs: ['javascript', 'typescript', 'python', 'java', 'go', 'rust']
    });
  }
  return highlighterInstance;
}

export async function highlightCode(code: string, language: string): Promise<string> {
  const highlighter = await initializeHighlighter();
  try {
    return highlighter.codeToHtml(code, {
      lang: language,
      theme: 'github-dark'
    });
  } catch (error) {
    console.error('Syntax highlighting error:', error);
    // Fallback to plain text with HTML escaping
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export async function highlightInline(code: string, language: string): Promise<string> {
  const highlighter = await initializeHighlighter();
  try {
    const html = await highlighter.codeToHtml(code, {
      lang: language,
      theme: 'github-dark'
    });
    // Convert block-level highlighting to inline
    return html
      .replace(/<pre[^>]*>/g, '<span>')
      .replace(/<\/pre>/g, '</span>')
      .replace(/<code[^>]*>/g, '')
      .replace(/<\/code>/g, '');
  } catch (error) {
    console.error('Inline syntax highlighting error:', error);
    return code;
  }
}