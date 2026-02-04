'use client';

import React, { useState } from 'react';
import { GlobalHeader, TabType } from '../components/GlobalHeader';
import { InpatientScreen } from '../components/InpatientScreen';
import { DashboardScreen } from '../components/DashboardScreen';
import { WardDailyScreen } from '../components/WardDailyScreen';
import { PatientManagementScreen } from '../components/PatientManagementScreen';
import { MasterSettingsScreen } from '../components/MasterSettingsScreen';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isNavigationBlocked, setIsNavigationBlocked] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientInitialTab, setPatientInitialTab] = useState<'basic' | 'matrix'>('basic');

  const handleTabChange = (newTab: TabType) => {
    if (isNavigationBlocked) {
      if (!window.confirm('編集中のデータは破棄されますが、移動してもよろしいですか？')) {
        return;
      }
      setIsNavigationBlocked(false);
    }
    setActiveTab(newTab);
    // Reset selection and tab preference when switching main tabs manually
    if (newTab !== 'patients') {
        setSelectedPatientId(null);
    }
    setPatientInitialTab('basic'); 
  };

  const handleNavigateToPatient = (patientId: string) => {
      // 1. If blocked, check first (reusing logic or simplified for now)
      if (isNavigationBlocked) {
          if (!window.confirm('編集中のデータは破棄されますが、移動してもよろしいですか？')) return;
          setIsNavigationBlocked(false);
      }
      // 2. Switch Tab & Set Patient & Set Matrix Mode
      setActiveTab('patients');
      setSelectedPatientId(patientId);
      setPatientInitialTab('matrix');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      <GlobalHeader activeTab={activeTab} onTabChange={handleTabChange} />
      
      <main className="flex-1 overflow-hidden relative">
        {/* Simple Tab Switching Logic */}
        {activeTab === 'home' && <DashboardScreen />}
        {activeTab === 'inpatients' && <InpatientScreen />}
        {activeTab === 'patients' && (
            <PatientManagementScreen 
                onEditingChange={setIsNavigationBlocked} 
                selectedPatientId={selectedPatientId}
                onSelectPatient={setSelectedPatientId}
                initialTab={patientInitialTab}
            />
        )}
        {activeTab === 'wards' && (
            <WardDailyScreen 
                onNavigateToPatient={handleNavigateToPatient}
            />
        )}
        {activeTab === 'settings' && <MasterSettingsScreen />}
      </main>
    </div>
  );
}
