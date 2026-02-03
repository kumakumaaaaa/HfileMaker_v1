import React, { useState, useEffect } from 'react';
import { MonthlyMatrixView } from './MonthlyMatrixView';
import { PatientDetailScreen } from './PatientDetailScreen';
import { AdvancedPatientList } from './AdvancedPatientList';
import { initializeStorage, getPatients, getAdmissions } from '../utils/storage';
import { Patient, Admission } from '../types/nursing';
import { User } from 'lucide-react';

export const InpatientScreen: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [allAdmissions, setAllAdmissions] = useState<Admission[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [sidebarWidth, setSidebarWidth] = useState(300); // Default wider for new list component
  const [isResizing, setIsResizing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [displayDate, setDisplayDate] = useState<string>(''); // Calendar view date
  const [listRefreshTrigger, setListRefreshTrigger] = useState(0); // Trigger to refresh patient list indicators

  // Resize Handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(250, Math.min(600, e.clientX));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Initial Load
  useEffect(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setDisplayDate(todayStr);

    initializeStorage();
    const ptList = getPatients();
    // Load ALL admissions by passing null explicitly
    const admList = getAdmissions(null); 
    
    setPatients(ptList);
    setAllAdmissions(admList);
  }, []);

  const handlePatientSelect = (patient: Patient) => {
      if (selectedPatientId === patient.id) return;
      
      if (hasUnsavedChanges) {
          if (!confirm('編集中のデータがあります。破棄して別の患者へ移動しますか？')) {
              return;
          }
      }
      setSelectedPatientId(patient.id);
      setHasUnsavedChanges(false);
  };
  
  // Find selected patient object
  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const selectedPatientAdmissions = allAdmissions.filter(a => a.patientId === selectedPatientId);

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-gray-100 relative">
      {/* Sidebar */}
      <div 
        className="bg-white border-r border-gray-200 flex flex-col shrink-0 relative group shadow-lg z-20"
        style={{ width: sidebarWidth }}
      >
        <div 
            className="absolute right-0 top-0 h-full w-4 cursor-col-resize z-50 flex flex-col justify-center items-center -mr-2 select-none group-hover:bg-blue-500/10 transition-colors"
            onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
            title="ドラッグして幅を調整"
        >
             <div className="w-1 h-8 bg-gray-300 rounded-full transition-colors group-hover:bg-blue-500" />
        </div>

        <AdvancedPatientList 
            patients={patients}
            allAdmissions={allAdmissions}
            selectedPatientId={selectedPatientId}
            onSelectPatient={handlePatientSelect}
            refreshTrigger={listRefreshTrigger}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative flex flex-col min-w-0 bg-gray-50">
          {selectedPatientId && selectedPatient ? (
              <PatientDetailScreen 
                  key={selectedPatientId}
                  patient={selectedPatient}
                  admissions={selectedPatientAdmissions}
                  onEditingChange={setHasUnsavedChanges}
                  initialTab="matrix"
                  hideHeader={true}
                  onUpdate={() => {
                      // Refresh patient/admission data
                      const pt = getPatients();
                      const allAdm = getAdmissions(null);
                      setPatients(pt);
                      setAllAdmissions(allAdm);
                      // Trigger refresh of list indicators (e.g., "未" icon)
                      setListRefreshTrigger(prev => prev + 1);
                  }}
              />
          ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-bold">患者を選択してください</p>
                  <p className="text-sm">左側のリストから対象患者を選択すると、<br/>看護必要度評価カレンダーが表示されます。</p>
              </div>
          )}
      </div>
    </div>
  );
};
