import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Activity, FileText, Flag } from 'lucide-react';
import { Patient, Admission } from '../types/nursing';
import { MonthlyMatrixView } from './MonthlyMatrixView';
import { PatientEditForm } from './PatientEditForm';
import { savePatient, saveAdmissions } from '../utils/storage';

interface PatientDetailScreenProps {
  patient: Patient;
  admissions: Admission[];
  onBack?: () => void; // Optional for split-view usage
  onUpdate?: () => void;
  onEditingChange?: (isEditing: boolean) => void;
}

type DetailTab = 'basic' | 'matrix';

export const PatientDetailScreen: React.FC<PatientDetailScreenProps> = ({ 
  patient, 
  admissions, 
  onBack, 
  onUpdate,
  onEditingChange 
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('basic');
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isFormEditing, setIsFormEditing] = useState(false);
  const [isMatrixDirty, setIsMatrixDirty] = useState(false);

  // Notify parent of editing state (Form OR Matrix)
  useEffect(() => {
    const isDirty = isFormEditing || isMatrixDirty;
    onEditingChange?.(isDirty);
    return () => onEditingChange?.(false);
  }, [isFormEditing, isMatrixDirty, onEditingChange]);

  // Edit Save Handler
  const handleEditSave = (updatedPatient: Patient, updatedAdmissions: Admission[]) => {
      savePatient(updatedPatient);
      saveAdmissions(updatedPatient.id, updatedAdmissions);
      setIsFormEditing(false);
      if (onUpdate) onUpdate();
  };

  const handleTabChange = (tab: DetailTab) => {
    if (activeTab === tab) return;
    if (isFormEditing || isMatrixDirty) {
        if (!confirm('編集中の変更は破棄されますが、移動してもよろしいですか？')) {
            return;
        }
        setIsFormEditing(false);
        setIsMatrixDirty(false);
    }
    setActiveTab(tab);
  };

  if (isFormEditing) {
      return (
          <PatientEditForm 
              initialPatient={patient}
              initialAdmissions={admissions}
              onSave={handleEditSave}
              onCancel={() => setIsFormEditing(false)}
          />
      );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 text-lg"> {/* Increased base font */}
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 shrink-0 shadow-sm">
        {onBack && (
          <button 
            onClick={onBack}
            className="p-3 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
        )}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            {patient.name} 
            <span className="text-lg font-normal text-gray-500">({patient.identifier})</span>
            {patient.excludeFromAssessment && (
                <span className="bg-red-100 text-red-700 text-sm px-3 py-1 rounded-full font-bold">
                    評価対象外
                </span>
            )}
          </h2>
        </div>
      </div>

      <div className="px-6 pt-4 flex gap-2 border-b border-gray-200 shrink-0">
          <button
            onClick={() => handleTabChange('basic')}
            className={`px-6 py-3 text-lg font-bold rounded-t-lg flex items-center gap-2 border-t border-l border-r border-transparent
              ${activeTab === 'basic' 
                ? 'bg-white text-blue-600 border-gray-200 border-b-white translate-y-[1px]' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}
            `}
          >
            <User className="w-5 h-5" /> 基本情報・入院歴
          </button>
          <button
            onClick={() => handleTabChange('matrix')}
            className={`px-6 py-3 text-lg font-bold rounded-t-lg flex items-center gap-2 border-t border-l border-r border-transparent
              ${activeTab === 'matrix' 
                ? 'bg-white text-blue-600 border-gray-200 border-b-white translate-y-[1px]' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}
            `}
          >
            <Activity className="w-5 h-5" /> 看護必要度評価カレンダー
          </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {activeTab === 'basic' && (
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Basic Info Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <FileText className="w-6 h-6" /> 患者基本情報
                        </h3>
                        <button 
                            onClick={() => setIsFormEditing(true)}
                            className="text-blue-600 font-bold hover:underline text-lg"
                        >
                            編集する
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <label className="block text-sm font-bold text-gray-500 uppercase mb-1">患者ID</label>
                            <p className="font-mono text-xl text-gray-800">{patient.identifier}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-500 uppercase mb-1">氏名</label>
                            <p className="text-xl text-gray-800">{patient.name}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-500 uppercase mb-1">性別</label>
                            <p className="text-xl text-gray-800">{patient.gender === '1' ? '男性' : (patient.gender === '2' ? '女性' : 'その他')}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-500 uppercase mb-1">生年月日</label>
                            <p className="text-xl text-gray-800">{patient.birthDate}</p>
                        </div>
                        
                        <div className="col-span-2 border-t border-gray-100 my-2"></div>

                        <div className="col-span-2">
                             <label className="block text-sm font-bold text-gray-500 uppercase mb-1">評価対象区分</label>
                             <div className="mt-1">
                                {patient.excludeFromAssessment ? (
                                    <span className="flex items-center gap-2 text-red-600 font-bold text-xl">
                                        <Flag className="w-5 h-5 fill-red-100" /> 評価対象外
                                    </span>
                                ) : (
                                    <span className="text-xl text-gray-800">評価対象</span>
                                )}
                             </div>
                        </div>

                        <div className="col-span-2 border-t border-gray-100 my-2"></div>

                        <div>
                            <label className="block text-sm font-bold text-gray-500 uppercase mb-1">郵便番号</label>
                            <p className="text-xl text-gray-800 font-mono">{patient.postalCode || '-'}</p>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-gray-500 uppercase mb-1">住所</label>
                            <p className="text-xl text-gray-800">{patient.address || '-'}</p>
                        </div>

                        <div className="col-span-2 border-t border-gray-100 my-2"></div>

                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-gray-500 uppercase mb-1">患者メモ</label>
                            <p className="text-xl text-gray-800 whitespace-pre-wrap leading-relaxed">
                                {patient.memo || '特記事項なし'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Admissions Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Activity className="w-6 h-6" /> 入院歴
                        </h3>
                        {/* Add Admission Button could go here */}
                    </div>

                    {admissions.length > 0 ? (
                        <div className="space-y-4">
                            {admissions.map(adm => (
                                <div key={adm.id} className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-2">
                                        <div className="text-xl font-bold text-gray-800 font-mono">
                                            {adm.admissionDate} <span className="text-gray-400 mx-2">〜</span> {adm.dischargeDate || '継続中'}
                                        </div>
                                        {!adm.dischargeDate && (
                                            <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded text-base inline-block text-center">入院中</span>
                                        )}
                                    </div>
                                    <div className="text-lg text-gray-600">
                                        入院時病棟: <span className="font-semibold">{adm.initialWard || '-'}</span> / <span className="font-semibold">{adm.initialRoom || '-'}</span>号室
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-lg">入院歴はありません</p>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'matrix' && (
            <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <MonthlyMatrixView 
                    patientId={patient.id}
                    patient={patient}
                    admissions={admissions}
                    currentDate={currentDate}
                    onDateSelect={setCurrentDate}
                    onDirtyChange={setIsMatrixDirty}
                    onPatientRefresh={onUpdate}
                />
            </div>
        )}
      </div>
    </div>
  );
};
