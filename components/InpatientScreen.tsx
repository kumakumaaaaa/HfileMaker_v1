import React, { useState, useEffect } from 'react';
import { MonthlyMatrixView } from './MonthlyMatrixView';
import { initializeStorage, getPatients, getAdmissions } from '../utils/storage';
import { Patient, DailyAssessment, Admission } from '../types/nursing';
import { User } from 'lucide-react';

export const InpatientScreen: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [admissionsMap, setAdmissionsMap] = useState<Record<string, Admission[]>>({});
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(0); 
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Resize Handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(200, Math.min(600, e.clientX));
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
    setCurrentDate(todayStr);

    initializeStorage();
    const ptList = getPatients();
    setPatients(ptList);
    
    const admMap: Record<string, Admission[]> = {};
    ptList.forEach(p => {
        admMap[p.id] = getAdmissions(p.id);
    });
    setAdmissionsMap(admMap);

    if (ptList.length > 0) {
      setSelectedPatientId(ptList[0].id);
    }
  }, []);

  const handlePatientSelect = (pid: string) => {
      if (selectedPatientId === pid) return;
      
      if (hasUnsavedChanges) {
          if (!confirm('編集中のデータがあります。破棄して別の患者へ移動しますか？')) {
              return;
          }
      }
      setSelectedPatientId(pid);
      setHasUnsavedChanges(false);
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-gray-100 relative">
      {/* Sidebar */}
      <div 
        className="bg-white border-r border-gray-200 flex flex-col shrink-0 relative group"
        style={{ width: sidebarWidth }}
      >
        <div 
            className="absolute right-0 top-0 h-full w-4 cursor-col-resize z-50 flex flex-col justify-start pt-32 items-center -mr-2 select-none"
            onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
        >
             <div className="w-1.5 h-16 bg-gray-300 rounded-full transition-colors hover:bg-gray-500 shadow-sm" />
        </div>

        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <h1 className="text-lg font-bold text-blue-800 flex items-center gap-2">
            <User className="w-5 h-5" /> 患者一覧
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {patients.map(patient => {
            const patientAdmissions = admissionsMap[patient.id] || [];
            const latestAdmission = patientAdmissions.sort((a: Admission, b: Admission) => b.admissionDate.localeCompare(a.admissionDate))[0];
    
            // Show only active admission or latest
            const isActive = latestAdmission && (!latestAdmission.dischargeDate || latestAdmission.dischargeDate >= currentDate);
            const admissionStr = latestAdmission ? `${latestAdmission.admissionDate} 入院` : '未入院';

            return (
            <button
              key={patient.id}
              onClick={() => handlePatientSelect(patient.id)}
              className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selectedPatientId === patient.id ? 'bg-blue-100 border-l-4 border-l-blue-600' : ''
              }`}
            >
              <div className="font-bold text-gray-800">{patient.name} <span className="text-xs font-normal text-gray-500">({patient.identifier})</span></div>
              <div className="text-xs text-gray-500 mt-1">
                {patient.gender === '1' ? '男性' : '女性'} / {patient.birthDate}生 / <span className={isActive ? 'text-blue-600 font-bold' : ''}>{admissionStr}</span>
              </div>
            </button>
            );
          })}
        </div>
        <div className="p-4 border-t border-gray-200 text-xs text-gray-400 text-center">
          Nursing Assessment System v1.1
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-4">
        {selectedPatientId && currentDate && (
          <section className="w-full min-w-0">
            <MonthlyMatrixView 
               patientId={selectedPatientId}
               currentDate={currentDate}
               onDateSelect={setCurrentDate}
               lastUpdated={lastUpdated}
               onDirtyChange={setHasUnsavedChanges}
            />
          </section>
        )}
      </div>
    </div>
  );
};
