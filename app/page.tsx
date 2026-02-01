'use client';

import React, { useState, useEffect } from 'react';
import { MonthlyMatrixView } from '../components/MonthlyMatrixView';
import { initializeStorage, getPatients, getAssessment } from '../utils/storage';
import { Patient, DailyAssessment } from '../types/nursing';
import { User } from 'lucide-react';

export default function Home() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [loadedData, setLoadedData] = useState<DailyAssessment['items'] | undefined>(undefined);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(0); 
  const [isMounted, setIsMounted] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // マウント判定
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ... (omitted)

  // Patient Selection Handler with Guard
  const handlePatientSelect = (pid: string) => {
      if (selectedPatientId === pid) return;
      
      if (hasUnsavedChanges) {
          if (!confirm('編集中のデータがあります。破棄して別の患者へ移動しますか？')) {
              return;
          }
      }
      setSelectedPatientId(pid);
      setHasUnsavedChanges(false); // Reset immediately on switch accepted
  };

  // ... (omitted)

  // 初回ロード
  useEffect(() => {
    // 日付の初期値を今日に
    const today = new Date().toISOString().split('T')[0];
    setCurrentDate(today);

    // データ初期化・取得
    initializeStorage();
    const ptList = getPatients();
    setPatients(ptList);
    if (ptList.length > 0) {
      setSelectedPatientId(ptList[0].id);
    }
  }, []);

  // ... (omitted)

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* サイドバー (患者リスト) */}
      <div 
        className="bg-white border-r border-gray-200 flex flex-col shrink-0 relative group"
        style={{ width: sidebarWidth }}
      >
        {/* Resize Handle (omitted) */}
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
          {patients.map(patient => (
            <button
              key={patient.id}
              onClick={() => handlePatientSelect(patient.id)}
              className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selectedPatientId === patient.id ? 'bg-blue-100 border-l-4 border-l-blue-600' : ''
              }`}
            >
              <div className="font-bold text-gray-800">{patient.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {patient.gender === '1' ? '男性' : '女性'} / {patient.birthday}生
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200 text-xs text-gray-400 text-center">
          Nursing Assessment System v1.1
        </div>
      </div>

      {/* メインエリア */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-4">

        {/* デバッグ用: 状態表示 (問題解決後削除予定) */}
        {!selectedPatientId || !currentDate ? (
            <div className="p-4 bg-yellow-100 text-yellow-800 rounded">
                <p>Loading State... Patient: {selectedPatientId || 'None'}, Date: {currentDate || 'None'}</p>
            </div>
        ) : null}

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
}
