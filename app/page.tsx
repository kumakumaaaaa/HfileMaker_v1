'use client';

import React, { useState } from 'react';
import { GlobalHeader, TabType } from '../components/GlobalHeader';
import { InpatientScreen } from '../components/InpatientScreen';
import { DashboardScreen } from '../components/DashboardScreen';
import { WardsScreen } from '../components/WardsScreen';
import { PatientManagementScreen } from '../components/PatientManagementScreen';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('home');

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      <GlobalHeader activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 overflow-hidden relative">
        {/* Simple Tab Switching Logic */}
        {activeTab === 'home' && <DashboardScreen />}
        {activeTab === 'inpatients' && <InpatientScreen />}
        {activeTab === 'patients' && <PatientManagementScreen />}
        {activeTab === 'wards' && <WardsScreen />}
        {activeTab === 'settings' && (
             <div className="p-8 text-center text-gray-400">設定画面 (Coming Soon)</div>
        )}
      </main>
    </div>
  );
}
