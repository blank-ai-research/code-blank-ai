import { promises as fs } from 'fs';
import path from 'path';

interface ProjectInfo {
  language: string;
  framework: string;
  dependencies: string[];
  patterns: string[];
}

export async function analyzeProject(rootDir: string): Promise<ProjectInfo> {
  // Read package.json for JS/TS projects
  const packageJson = await fs.readFile(path.join(rootDir, 'package.json'), 'utf-8');
  const { dependencies, devDependencies } = JSON.parse(packageJson);
  
  // Detect framework
  const framework = detectFramework({ dependencies, devDependencies });
  
  // Analyze file extensions
  const files = await getAllFiles(rootDir);
  const language = detectPrimaryLanguage(files);
  
  // Identify common patterns
  const patterns = await analyzeCodePatterns(files);
  
  return {
    language,
    framework,
    dependencies: [...Object.keys(dependencies), ...Object.keys(devDependencies)],
    patterns
  };
}