'use client';

import React, { useState } from 'react';
import { GlobalHeader, TabType } from '../components/GlobalHeader';
import { InpatientScreen } from '../components/InpatientScreen';
import { DashboardScreen } from '../components/DashboardScreen';
import { WardsScreen } from '../components/WardsScreen';
import { PatientManagementScreen } from '../components/PatientManagementScreen';
import { MasterSettingsScreen } from '../components/MasterSettingsScreen';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isNavigationBlocked, setIsNavigationBlocked] = useState(false);

  const handleTabChange = (newTab: TabType) => {
    if (isNavigationBlocked) {
      if (!window.confirm('編集中のデータは破棄されますが、移動してもよろしいですか？')) {
        return;
      }
      setIsNavigationBlocked(false);
    }
    setActiveTab(newTab);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      <GlobalHeader activeTab={activeTab} onTabChange={handleTabChange} />
      
      <main className="flex-1 overflow-hidden relative">
        {/* Simple Tab Switching Logic */}
        {activeTab === 'home' && <DashboardScreen />}
        {activeTab === 'inpatients' && <InpatientScreen />}
        {activeTab === 'patients' && (
            <PatientManagementScreen onEditingChange={setIsNavigationBlocked} />
        )}
        {activeTab === 'wards' && <WardsScreen />}
        {activeTab === 'settings' && <MasterSettingsScreen />}
      </main>
    </div>
  );
}
