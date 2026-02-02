import React, { useState } from 'react';
import { ArrowLeft, User, FileText, Activity } from 'lucide-react';
import { Patient, Admission } from '../types/nursing';
import { MonthlyMatrixView } from './MonthlyMatrixView';

interface PatientDetailScreenProps {
  patient: Patient;
  admissions: Admission[];
  onBack: () => void;
}

type DetailTab = 'basic' | 'matrix';

export const PatientDetailScreen: React.FC<PatientDetailScreenProps> = ({ patient, admissions, onBack }) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('basic');
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 shrink-0 shadow-sm">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            {patient.name} 
            <span className="text-sm font-normal text-gray-500">({patient.identifier})</span>
          </h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 flex gap-1 border-b border-gray-200 shrink-0">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 border-t border-l border-r border-transparent
              ${activeTab === 'basic' 
                ? 'bg-white text-blue-600 border-gray-200 border-b-white translate-y-[1px]' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}
            `}
          >
            <User className="w-4 h-4" /> 基本情報・入院歴
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 border-t border-l border-r border-transparent
              ${activeTab === 'matrix' 
                ? 'bg-white text-blue-600 border-gray-200 border-b-white translate-y-[1px]' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}
            `}
          >
            <Activity className="w-4 h-4" /> 看護必要度マトリクス
          </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'basic' && (
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Basic Info Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> 患者基本情報
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">患者ID</label>
                            <p className="mt-1 font-mono text-gray-800">{patient.identifier}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">氏名</label>
                            <p className="mt-1 text-gray-800">{patient.name}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">性別</label>
                            <p className="mt-1 text-gray-800">{patient.gender === '1' ? '男性' : '女性'}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">生年月日</label>
                            <p className="mt-1 text-gray-800">{patient.birthDate}</p>
                        </div>
                    </div>
                </div>

                {/* Admissions Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4" /> 入院歴
                    </h3>
                    {admissions.length > 0 ? (
                        <div className="space-y-4">
                            {admissions.map(adm => (
                                <div key={adm.id} className="p-4 bg-gray-50 rounded border border-gray-100">
                                    <div className="flex font-semibold text-gray-700 mb-2">
                                        {adm.admissionDate} 〜 {adm.dischargeDate || '継続中'}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        開始病棟: {adm.initialWard || '-'} {adm.initialRoom}号室
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400">入院歴はありません</p>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'matrix' && (
            <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <MonthlyMatrixView 
                    patientId={patient.id}
                    currentDate={currentDate}
                    onDateSelect={setCurrentDate}
                />
            </div>
        )}
      </div>
    </div>
  );
};
