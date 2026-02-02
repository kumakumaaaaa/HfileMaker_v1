import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Plus, ChevronLeft, ChevronRight, Edit, Calendar, FileText, Flag } from 'lucide-react';
import { Patient, Admission } from '../types/nursing';
import { getPatients, getAdmissions, savePatient, saveAdmissions } from '../utils/storage';
import { PatientDetailScreen } from './PatientDetailScreen';
import { PatientEditForm } from './PatientEditForm';

const PAGE_SIZE = 20;

interface PatientManagementScreenProps {
  onEditingChange?: (isEditing: boolean) => void;
}

export const PatientManagementScreen: React.FC<PatientManagementScreenProps> = ({ onEditingChange }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [admissionsMap, setAdmissionsMap] = useState<Record<string, Admission[]>>({});
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Filter States
  const [filterName, setFilterName] = useState('');
  const [filterBirthDate, setFilterBirthDate] = useState('');
  const [filterPeriodStart, setFilterPeriodStart] = useState('');
  const [filterPeriodEnd, setFilterPeriodEnd] = useState('');
  const [filterExcludedOnly, setFilterExcludedOnly] = useState(false);
  
  // Create / Edit State
  const [isCreating, setIsCreating] = useState(false); 
  const [creatingPatient, setCreatingPatient] = useState<Patient | null>(null);

  // Notify parent of editing state
  useEffect(() => {
      onEditingChange?.(isCreating);
  }, [isCreating, onEditingChange]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Initial Load
  useEffect(() => {
    const ptList = getPatients();
    setPatients(ptList); 
    
    // Fetch admissions for all patients
    const admMap: Record<string, Admission[]> = {};
    ptList.forEach(p => {
        admMap[p.id] = getAdmissions(p.id);
    });
    setAdmissionsMap(admMap);
  }, []);

  // Filtering Logic
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      // 1. Name Filter
      const matchName = p.name.includes(filterName) || (p.identifier && p.identifier.includes(filterName));
      if (!matchName) return false;

      // 2. Birth Date Filter (Exact match)
      if (filterBirthDate && p.birthDate !== filterBirthDate) return false;

      // 3. Admission Period Filter (Overlap check)
      if (filterPeriodStart || filterPeriodEnd) {
          const pAdmissions = admissionsMap[p.id] || [];
          const hasOverlap = pAdmissions.some(adm => {
             const admStart = adm.admissionDate;
             const admEnd = adm.dischargeDate || '9999-12-31'; // Treat active as far future
             
             const searchStart = filterPeriodStart || '0000-01-01';
             const searchEnd = filterPeriodEnd || '9999-12-31';

             return admStart <= searchEnd && admEnd >= searchStart;
          });
          if (!hasOverlap) return false;
      }
      
      // 4. Excluded Only Filter
      if (filterExcludedOnly && !p.excludeFromAssessment) return false;

      return true;
    }).sort((a, b) => b.id.localeCompare(a.id)); 
  }, [patients, filterName, filterBirthDate, filterPeriodStart, filterPeriodEnd, filterExcludedOnly, admissionsMap]);
  
  // Pagination Logic
  const totalPages = Math.ceil(filteredPatients.length / PAGE_SIZE);
  
  const currentPatients = useMemo(() => {
    const firstPageIndex = (currentPage - 1) * PAGE_SIZE;
    const lastPageIndex = firstPageIndex + PAGE_SIZE;
    return filteredPatients.slice(firstPageIndex, lastPageIndex);
  }, [currentPage, filteredPatients]);
  
  // Helper to reset pagination when filter changes
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
      setter(value);
      setCurrentPage(1);
  };

  // Create Handler
  const handleCreateStart = () => {
      const allPatients = getPatients();
      let maxId = 0;
      allPatients.forEach(p => {
          const num = parseInt(p.identifier, 10);
          if (!isNaN(num) && num > maxId) maxId = num;
      });
      const nextId = String(maxId + 1).padStart(5, '0'); // Assuming 5 digit ID like 10001
      
      const newDummyPatient: Patient = {
          id: '', // Will be generated on save
          identifier: nextId,
          name: '',
          gender: '1', // Default
          birthDate: '',
          postalCode: '',
          address: '',
          memo: '',
          excludeFromAssessment: false
      };
      
      setCreatingPatient(newDummyPatient);
      setIsCreating(true);
  };

  const handleCreateSave = (newPatient: Patient, newAdmissions: Admission[]) => {
      savePatient(newPatient);
      saveAdmissions(newPatient.id, newAdmissions);
      
      // Refresh Data
      setPatients(getPatients());
      const admMap: Record<string, Admission[]> = {};
      getPatients().forEach(p => {
            admMap[p.id] = getAdmissions(p.id);
      });
      setAdmissionsMap(admMap);
      
      setIsCreating(false);
      setCreatingPatient(null);
  };

  if (isCreating && creatingPatient) {
      return (
          <PatientEditForm 
              initialPatient={creatingPatient}
              onSave={handleCreateSave}
              onCancel={() => { setIsCreating(false); setCreatingPatient(null); }}
          />
      );
  }

  // Detail View Rendering
  if (selectedPatient) {
      return (
          <PatientDetailScreen 
              patient={selectedPatient}
              admissions={admissionsMap[selectedPatient.id] || []}
              onEditingChange={onEditingChange}
              onBack={() => setSelectedPatient(null)}
              onUpdate={() => {
                  // Refresh data when returning from detail (in case of edits there)
                  setPatients(getPatients());
                   const admMap: Record<string, Admission[]> = {};
                    getPatients().forEach(p => {
                        admMap[p.id] = getAdmissions(p.id);
                    });
                    setAdmissionsMap(admMap);
              }}
          />
      );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 text-lg">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-600" />
            患者管理
        </h2>
        <button 
            onClick={handleCreateStart}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2 font-bold text-lg"
        >
            <Plus className="w-5 h-5" /> 新規患者登録
        </button>
      </div>
      
      {/* Filter Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap gap-4 items-end shrink-0 shadow-sm">
        {/* Name Search */}
        <div className="relative">
            <label className="block text-sm font-bold text-gray-500 mb-1">キーワード検索</label>
            <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                    type="text"
                    placeholder="氏名・ID..." 
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    value={filterName}
                    onChange={(e) => handleFilterChange(setFilterName, e.target.value)}
                />
            </div>
        </div>

        {/* Birth Date Search */}
        <div>
            <label className="block text-sm font-bold text-gray-500 mb-1">生年月日</label>
            <input 
                type="date"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                value={filterBirthDate}
                onChange={(e) => handleFilterChange(setFilterBirthDate, e.target.value)}
            />
        </div>

        {/* Admission Period Search */}
        <div className="flex items-center gap-2">
            <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">入院期間 (開始)</label>
                <input 
                    type="date"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    value={filterPeriodStart}
                    onChange={(e) => handleFilterChange(setFilterPeriodStart, e.target.value)}
                />
            </div>
            <span className="text-gray-400 mt-8">〜</span>
            <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">入院期間 (終了)</label>
                <input 
                    type="date"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    value={filterPeriodEnd}
                    onChange={(e) => handleFilterChange(setFilterPeriodEnd, e.target.value)}
                />
            </div>
        </div>

        {/* Excluded Only Filter */}
        <div className="pb-3 pl-4">
             <label className="flex items-center gap-2 cursor-pointer">
                 <input 
                     type="checkbox"
                     className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                     checked={filterExcludedOnly}
                     onChange={(e) => handleFilterChange(setFilterExcludedOnly, e.target.checked)}
                 />
                 <span className="text-lg font-bold text-gray-700">評価対象外のみ</span>
             </label>
        </div>
      </div>

      {/* Main Content: Table */}
      <div className="p-6 flex-1 overflow-auto">
         <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
             <table className="w-full text-left">
                 <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 text-lg">
                     <tr>
                         <th className="px-6 py-4 whitespace-nowrap text-center">患者ID</th>
                         <th className="px-6 py-4 whitespace-nowrap text-center">氏名</th>
                         <th className="px-6 py-4 whitespace-nowrap text-center">性別</th>
                         <th className="px-6 py-4 whitespace-nowrap text-center">生年月日</th>
                         <th className="px-6 py-4 whitespace-nowrap text-center">対象外</th>
                         <th className="px-6 py-4 whitespace-nowrap text-center">メモ</th>
                         <th className="px-6 py-4 min-w-[300px]">最新の入院歴</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {currentPatients.map(patient => {
                        const patientAdmissions = admissionsMap[patient.id] || [];
                        const latestAdm = patientAdmissions.sort((a,b) => b.admissionDate.localeCompare(a.admissionDate))[0];
                        const admStr = latestAdm 
                            ? `${latestAdm.admissionDate} 〜 ${latestAdm.dischargeDate || '入院中'}`
                            : '記録なし';
                        const wardStr = latestAdm ? `${latestAdm.initialWard || '-'} / ${latestAdm.initialRoom || '-'}` : '-';

                        return (
                            <tr 
                                key={patient.id} 
                                onClick={() => setSelectedPatient(patient)}
                                className="hover:bg-blue-50 transition-colors cursor-pointer group text-xl" 
                            >
                                <td className="px-6 py-4 font-mono text-gray-600 text-center">{patient.identifier}</td>
                                <td className="px-6 py-4 font-bold text-gray-800 text-center">{patient.name}</td>
                                <td className="px-6 py-4 text-gray-600 text-center">
                                    {patient.gender === '1' ? '男性' : (patient.gender === '2' ? '女性' : 'その他')}
                                </td>
                                <td className="px-6 py-4 text-gray-600 font-mono text-center">
                                    {patient.birthDate}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {patient.excludeFromAssessment && (
                                        <div className="flex justify-center">
                                            <Flag className="w-6 h-6 text-red-500 fill-red-100" />
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-gray-500 text-lg max-w-xs truncate text-center">
                                    {patient.memo || '-'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <div className="font-medium text-gray-700 flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-gray-400" /> {admStr}
                                        </div>
                                        <div className="text-base text-gray-500 mt-1 ml-7">
                                            病棟: {wardStr}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {currentPatients.length === 0 && (
                        <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-lg">
                                条件に一致する患者が見つかりません
                            </td>
                        </tr>
                    )}
                 </tbody>
             </table>
             
             {/* Pagination Footer */}
             <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                 <div className="text-sm text-gray-500">
                     全 {filteredPatients.length} 件中 {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredPatients.length)} - {Math.min(currentPage * PAGE_SIZE, filteredPatients.length)} 件を表示
                 </div>
                 <div className="flex items-center gap-2">
                     <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                     >
                         <ChevronLeft className="w-6 h-6" />
                     </button>
                     <span className="text-lg font-medium text-gray-700 px-2">
                         page {currentPage} / {Math.max(1, totalPages)}
                     </span>
                     <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-2 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                     >
                         <ChevronRight className="w-6 h-6" />
                     </button>
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};
