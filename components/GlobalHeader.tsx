import React from 'react';
import { LayoutDashboard, Users, BedDouble, Settings, Building2 } from 'lucide-react';

export type TabType = 'home' | 'inpatients' | 'patients' | 'wards' | 'settings';

interface GlobalHeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', label: 'ホーム', icon: LayoutDashboard },
    { id: 'patients', label: '患者管理', icon: Users }, // Moved here
    { id: 'inpatients', label: '入院患者', icon: BedDouble },
    { id: 'wards', label: '病棟・病室', icon: Building2 },
    { id: 'settings', label: 'マスタ設定', icon: Settings },
  ] as const;

  return (
    <header className="bg-white border-b border-gray-200 h-14 flex items-center px-4 shrink-0 relative z-50">
      <div className="font-bold text-xl mr-8 text-blue-900">
        HfileMaker
      </div>
      
      <nav className="flex h-full">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 h-full border-b-2 text-lg font-bold transition-colors
                ${isActive 
                  ? 'border-blue-600 text-blue-600 bg-blue-50' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
              `}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </nav>
      
      <div className="ml-auto flex items-center gap-4 text-xs text-gray-400">
        Demo User
      </div>
    </header>
  );
};
