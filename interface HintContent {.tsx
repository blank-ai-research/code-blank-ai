interface HintContent {
  title: string;
  documentation: string;
  logic: string;
  examples: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const HintPopover: React.FC<{hint: HintContent}> = ({ hint }) => {
  return (
    <div className="hint-popover">
      <div className="hint-header">
        <h3>{hint.title}</h3>
        <span className={`difficulty-badge ${hint.difficulty}`}>
          {hint.difficulty}
        </span>
      </div>
      
      <div className="hint-tabs">
        <Tab label="Documentation">
          <div className="docs-content">{hint.documentation}</div>
        </Tab>
        <Tab label="Logic Explanation">
          <div className="logic-content">{hint.logic}</div>
        </Tab>
        <Tab label="Examples">
          <div className="examples-content">
            {hint.examples.map((example, i) => (
              <CodeBlock key={i} code={example} />
            ))}
          </div>
        </Tab>
      </div>
    </div>
  );
};