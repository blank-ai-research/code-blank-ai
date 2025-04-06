
import React from 'react';
import { Files, Settings, Play, Search, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onChangeTab }) => {
  const tabs = [
    { id: 'explorer', icon: <Files size={24} />, title: 'Explorer' },
    { id: 'search', icon: <Search size={24} />, title: 'Search' },
    { id: 'git', icon: <GitBranch size={24} />, title: 'Source Control' },
    { id: 'run', icon: <Play size={24} />, title: 'Run' },
    { id: 'settings', icon: <Settings size={24} />, title: 'Settings' },
  ];

  return (
    <div className="w-12 h-full bg-gray-100 dark:bg-gray-900 border-r flex flex-col items-center py-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={cn(
            "p-2 mb-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800",
            activeTab === tab.id && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
          )}
          title={tab.title}
          onClick={() => onChangeTab(tab.id)}
        >
          {tab.icon}
        </button>
      ))}
    </div>
  );
};

export default Sidebar;
