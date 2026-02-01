'use client';

import React, { useState, useEffect } from 'react';
import { NursingAssessmentForm } from '../components/NursingAssessmentForm';
import { MonthlyMatrixView } from '../components/MonthlyMatrixView';
import { initializeStorage, getPatients, getAssessment, saveAssessment, getPreviousDayAssessment } from '../utils/storage';
import { Patient, DailyAssessment } from '../types/nursing';
import { User } from 'lucide-react';

export default function Home() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [loadedData, setLoadedData] = useState<DailyAssessment['items'] | undefined>(undefined);
  const [lastUpdated, setLastUpdated] = useState<number>(0); // 初期値0で安全化
  const [isMounted, setIsMounted] = useState(false);

  // マウント判定
  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  // 患者・日付変更時にデータをロード
  useEffect(() => {
    if (!selectedPatientId || !currentDate) return;

    const data = getAssessment(selectedPatientId, currentDate);
    if (data) {
      setLoadedData(data.items);
    } else {
      setLoadedData(undefined); // 新規
    }
  }, [selectedPatientId, currentDate, lastUpdated]); // lastUpdatedが変わった時もロードし直す

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const handleSave = (items: Record<string, boolean | number>, scores: { a: number, b: number, c: number }, isSevere: boolean) => {
    if (!selectedPatientId || !currentDate) {
      alert('患者または日付が選択されていません');
      return;
    }

    const assessment: DailyAssessment = {
      patientId: selectedPatientId,
      date: currentDate,
      items,
      admissionFeeId: 'acute_general_5',
      scores,
      isSevere
    };
    saveAssessment(assessment);
    setLastUpdated(Date.now()); // 更新通知 (マトリックスも再描画される)
  };

  const handleCopyPrevious = () => {
    if (!selectedPatientId || !currentDate) return;
    const prevData = getPreviousDayAssessment(selectedPatientId, currentDate);
    if (prevData) {
      if (confirm(`${prevData.date} のデータをコピーしますか？`)) {
        setLoadedData(prevData.items);
      }
    } else {
      alert('前日のデータが見つかりませんでした');
    }
  };

  if (!isMounted) {
    return <div className="flex h-screen items-center justify-center bg-gray-100">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* サイドバー (患者リスト) */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <h1 className="text-lg font-bold text-blue-800 flex items-center gap-2">
            <User className="w-5 h-5" /> 患者一覧
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {patients.map(patient => (
            <button
              key={patient.id}
              onClick={() => setSelectedPatientId(patient.id)}
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
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* デバッグ用: 状態表示 (問題解決後削除予定) */}
        {!selectedPatientId || !currentDate ? (
            <div className="p-4 bg-yellow-100 text-yellow-800 rounded">
                <p>Loading State... Patient: {selectedPatientId || 'None'}, Date: {currentDate || 'None'}</p>
            </div>
        ) : null}

        {selectedPatientId && currentDate && (
          <div className="border border-green-300 rounded p-1"> {/* 領域確認用ボーダー */}
             <MonthlyMatrixView 
                patientId={selectedPatientId}
                currentDate={currentDate}
                onDateSelect={setCurrentDate}
                lastUpdated={lastUpdated}
             />
          </div>
        )}

        <NursingAssessmentForm 
          key={`${selectedPatientId}-${currentDate}`}
          patientName={selectedPatient?.name}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          initialData={loadedData}
          onSave={handleSave}
          onCopyPrevious={handleCopyPrevious}
        />
      </div>
    </div>
  );
}
