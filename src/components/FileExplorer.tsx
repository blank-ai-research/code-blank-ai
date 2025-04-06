
import React from 'react';
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  language?: string;
  children?: FileItem[];
  isOpen?: boolean;
}

interface FileExplorerProps {
  files: FileItem[];
  onSelectFile: (file: FileItem) => void;
  selectedFileId?: string;
}

const FileExplorer = ({ files, onSelectFile, selectedFileId }: FileExplorerProps) => {
  const [expandedFolders, setExpandedFolders] = React.useState<Record<string, boolean>>({
    root: true
  });

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const renderFileIcon = (language?: string) => {
    switch (language) {
      case 'javascript':
        return <div className="w-4 h-4 mr-1.5 text-yellow-400">JS</div>;
      case 'typescript':
        return <div className="w-4 h-4 mr-1.5 text-blue-400">TS</div>;
      case 'python':
        return <div className="w-4 h-4 mr-1.5 text-green-400">PY</div>;
      default:
        return <File className="w-4 h-4 mr-1.5" />;
    }
  };

  const renderFileTree = (items: FileItem[], level = 0) => {
    return items.map(item => (
      <div key={item.id} className="flex flex-col">
        <div 
          className={cn(
            "flex items-center py-0.5 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer",
            selectedFileId === item.id && "bg-blue-100 dark:bg-blue-900"
          )}
          style={{ paddingLeft: `${level * 12 + 4}px` }}
          onClick={() => {
            if (item.type === 'folder') {
              toggleFolder(item.id);
            } else {
              onSelectFile(item);
            }
          }}
        >
          {item.type === 'folder' && (
            expandedFolders[item.id] ? 
              <ChevronDown className="w-4 h-4 mr-1" /> : 
              <ChevronRight className="w-4 h-4 mr-1" />
          )}
          {item.type === 'folder' ? 
            <Folder className="w-4 h-4 mr-1.5 text-blue-500" /> : 
            renderFileIcon(item.language)
          }
          <span className="truncate text-sm">{item.name}</span>
        </div>
        
        {item.type === 'folder' && 
         item.children && 
         expandedFolders[item.id] && 
         renderFileTree(item.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-2">
        <h2 className="text-sm font-semibold mb-2">Explorer</h2>
        {renderFileTree(files)}
      </div>
    </div>
  );
};

export default FileExplorer;
