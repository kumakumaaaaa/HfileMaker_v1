import React from 'react';
import { LayoutDashboard, Users, BedDouble, Settings, Building2, LogOut } from 'lucide-react';

export type TabType = 'home' | 'inpatients' | 'patients' | 'wards' | 'settings';

import { UserAccount } from '../types/nursing';

interface GlobalHeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  currentUser?: UserAccount | null;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({ activeTab, onTabChange, currentUser }) => {
  const tabs = [
    { id: 'home', label: 'ホーム', icon: LayoutDashboard },
    { id: 'patients', label: '患者管理', icon: Users }, // Moved here
    { id: 'inpatients', label: '入院患者', icon: BedDouble },
    { id: 'wards', label: '病棟・病室', icon: Building2 },
    { id: 'settings', label: 'マスタ設定', icon: Settings },
  ] as const;

  // Default fallback if no user provided (though page should provide it)
  const displayName = currentUser?.name || 'ゲスト';
  const displayRole = currentUser?.authority || 'ゲストアカウント';
  const displayIconChar = displayName.charAt(0);

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
      
      <div className="ml-auto relative group">
        <button className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-lg shadow-sm hover:bg-indigo-700 transition">
            {displayIconChar}
        </button>

        {/* Hover Dropdown */}
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right">
            <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xl">
                    {displayIconChar}
                </div>
                <div>
                    <div className="font-bold text-gray-800 text-lg">{displayName}</div>
                    <div className="text-xs text-gray-500">{displayRole}</div>
                </div>
            </div>
            
            <div className="border-t border-gray-100 my-2"></div>
            
            <button className="w-full flex items-center gap-2 p-2 text-red-600 hover:bg-red-50 rounded transition-colors text-sm font-bold">
                <LogOut className="w-4 h-4" /> ログアウト
            </button>
        </div>
      </div>
    </header>
  );
};
