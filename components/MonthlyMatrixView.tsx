'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { DailyAssessment, ITEM_DEFINITIONS, NursingItemDefinition } from '../types/nursing';
import { getMonthlyAssessments, saveAssessment } from '../utils/storage';
import { evaluatePatient } from '../utils/evaluation';
import { CellEditPopup } from './CellEditPopup'; // Import popup
import { Edit2, Save, X, AlertCircle } from 'lucide-react'; // Icons

interface MonthlyMatrixViewProps {
  patientId: string;
  currentDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  lastUpdated?: number;
}

export const MonthlyMatrixView: React.FC<MonthlyMatrixViewProps> = ({ 
  patientId, 
  currentDate, 
  onDateSelect,
  lastUpdated 
}) => {
  // --- Basic Data Loading ---
  const targetDateObj = new Date(currentDate);
  const year = targetDateObj.getFullYear();
  const month = targetDateObj.getMonth() + 1;
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

  const daysInMonth = new Date(year, month, 0).getDate();
  const dateList = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  });

  const [monthlyData, setMonthlyData] = useState<Record<string, DailyAssessment>>({});

  useEffect(() => {
    setMonthlyData(getMonthlyAssessments(patientId, yearMonth));
  }, [patientId, yearMonth, lastUpdated]);

  const itemsByCategory = useMemo(() => {
    const grouped = { a: [], b: [], c: [] } as Record<string, typeof ITEM_DEFINITIONS>;
    ITEM_DEFINITIONS.forEach(item => {
      if (grouped[item.category]) grouped[item.category].push(item);
    });
    return grouped;
  }, []);

  // --- Edit Mode State ---
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [tempAssessment, setTempAssessment] = useState<DailyAssessment | null>(null);
  
  // Popover State
  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    item: NursingItemDefinition | null;
    position: { x: number; y: number };
  }>({ isOpen: false, item: null, position: { x: 0, y: 0 } });

  // Start Editing
  const handleStartEdit = (date: string) => {
    if (editingDate && editingDate !== date) {
      if (!confirm('現在編集中のデータを破棄して別の日の編集を開始しますか？')) return;
    }
    
    // Load current data or create empty template
    const current = monthlyData[date];
    const initialData: DailyAssessment = current ? JSON.parse(JSON.stringify(current)) : {
       patientId,
       date,
       items: {},
       scores: { a: 0, b: 0, c: 0 },
       isSevere: false,
       admissionFeeId: 'acute_general_5' // default
    };

    setEditingDate(date);
    setTempAssessment(initialData);
  };

  // Cancel Editing
  const handleCancelEdit = () => {
    if (confirm('編集中の内容を破棄しますか？')) {
      setEditingDate(null);
      setTempAssessment(null);
      setPopupState({ ...popupState, isOpen: false });
    }
  };

  // Save Editing
  const handleSaveEdit = () => {
    if (!tempAssessment) return;
    saveAssessment(tempAssessment);
    
    // Update local view immediately (optimistic update equivalent) or wait for trigger
    // Since we rely on storage re-fetch via parent trigger, we might need to manually update local state here 
    // to reflect changes instantly without waiting for parent re-render if we want super fast feedback, 
    // but standard flow is fine.
    
    // Force reload local
    setMonthlyData(prev => ({ ...prev, [tempAssessment.date]: tempAssessment }));
    
    setEditingDate(null);
    setTempAssessment(null);
  };

  // Cell Click (Open Popup)
  const handleCellClick = (e: React.MouseEvent, date: string, item: NursingItemDefinition) => {
    if (editingDate !== date) {
        if (date !== currentDate) onDateSelect(date);
        return;
    }

    // Open popup to the RIGHT of the cell
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const popupWidth = 320;
    
    // Default: Right side
    let x = rect.right + 10;
    let y = rect.top + window.scrollY; // Align top

    // If overflow right, go left
    if (x + popupWidth > window.innerWidth) {
        x = rect.left - popupWidth - 10;
    }
    
    setPopupState({
      isOpen: true,
      item,
      position: { x, y }
    });
  };

  // Update Value from Popup
  const handleValueChange = (val: boolean | number, assistVal?: number) => {
    if (!tempAssessment || !popupState.item) return;
    
    const newItemId = popupState.item.id;
    const newItems = { ...tempAssessment.items, [newItemId]: val };
    
    // Save assistance value if provided
    if (typeof assistVal === 'number') {
        newItems[`${newItemId}_assist`] = assistVal;
    }
    
    // Recalculate Scores
    let a = 0, b = 0, c = 0;
    ITEM_DEFINITIONS.forEach(def => {
       const v = newItems[def.id];
       if (def.category === 'a' && v === true) a += def.points;
       if (def.category === 'c' && v === true) c += def.points;
       if (def.category === 'b' && typeof v === 'number') {
          // B items logic
          let points = v;
          if (def.hasAssistance) {
             const av = newItems[`${def.id}_assist`];
             const mult = (typeof av === 'number') ? av : 0; // Default to 0 if undefined? Or maybe 1?
             // If we just enabled assistance logic, existing data might be undefined.
             // But if we default to 0, existing data score drops to 0. 
             // In Popup we default to 1. Here we should probably default to 1 IF undefined, or 0?
             // Since we default to 1 in popup, let's use 1 if undefined to avoid clearing scores of old data.
             // Wait, earlier I said "Not performed = 0".
             // If data is newly created, it's undefined. Popup edit sets it.
             // Safe bet: if undefined, treat as 1 (present) to not break existing? 
             // Or 0?
             // Let's check initialization.
             // If undefined, let's assume 1 (Implementation YES) for safety, usually users complain if scores drop.
             // But strictly, if not set, maybe it's 0. 
             // Let's use `av ?? 1`.
             points = points * (mult ?? 1);
          }
          b += points;
       }
    });

    const isSevere = evaluatePatient(tempAssessment.admissionFeeId, { items: newItems, scoreA: a, scoreB: b, scoreC: c });

    setTempAssessment({
      ...tempAssessment,
      items: newItems,
      scores: { a, b, c },
      isSevere
    });
  };

  return (
    <div className="bg-white rounded-lg shadow mb-6 border border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          月間評価推移 ({year}年{month}月) 
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">New</span>
          {editingDate && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded flex items-center gap-1"><Edit2 className="w-3 h-3"/> 編集中: {editingDate}</span>}
        </h2>
      </div>
      
      {/* Removed scroll and sticky, just auto layout */}
      <div className="w-full"> 
        <table className="w-full text-xs text-center border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border border-gray-300 min-w-[200px] text-left bg-gray-100">項目 / 日付</th>
              {dateList.map(date => {
                const day = parseInt(date.split('-')[2]);
                const isSelected = date === currentDate;
                const isEditing = date === editingDate;
                
                // Data source: use temp if editing, else stored
                const data = isEditing ? tempAssessment : monthlyData[date];
                const isSevere = data?.isSevere;
                
                return (
                  <th 
                    key={date} 
                    className={`
                      p-2 border border-gray-300 min-w-[60px] transition-colors relative group
                      ${isEditing ? 'bg-yellow-50 border-yellow-400 border-2 border-b-0' : ''}
                      ${!isEditing && isSelected ? 'bg-blue-600 text-white' : ''}
                      ${!isEditing && !isSelected ? 'hover:bg-gray-200' : ''}
                      ${!isEditing && isSevere ? 'bg-pink-100 text-red-800' : ''}
                    `}
                    onClick={() => !isEditing && onDateSelect(date)}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span>{day}</span>
                      {isEditing ? (
                         <div className="flex gap-1 z-50 relative"> {/* z-index explicit for buttons */}
                           <button onClick={handleSaveEdit} className="p-1 bg-green-500 text-white rounded hover:bg-green-600" title="保存"><Save className="w-3 h-3"/></button>
                           <button onClick={handleCancelEdit} className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600" title="キャンセル"><X className="w-3 h-3"/></button>
                         </div>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleStartEdit(date); }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* Rows Logic Helper */}
            {(() => {
                const renderRow = (item: NursingItemDefinition) => (
                   <tr key={item.id}>
                    <td className="p-2 border border-gray-300 text-left bg-white truncate max-w-[200px]" title={item.label}>
                      {item.label}
                    </td>
                    {dateList.map(date => {
                      const isEditing = date === editingDate;
                      const data = isEditing ? tempAssessment : monthlyData[date];
                      
                      const val = data?.items?.[item.id];
                      // Checkbox logic
                      let displayVal: React.ReactNode = '';
                      if (item.inputType === 'checkbox') {
                          if (val === true) displayVal = <span className="text-blue-600 font-bold">●</span>;
                      } else {
                          // B items - simple number for matrix
                          if (typeof val === 'number') displayVal = val;
                      }

                      // Dirty check (only if editing)
                      const originalVal = isEditing ? monthlyData[date]?.items?.[item.id] : undefined;
                      const isDirty = isEditing && val !== originalVal; // Simple equality check

                      return (
                        <td 
                          key={date} 
                          className={`
                            border border-gray-300 relative
                            ${isEditing ? 'cursor-pointer hover:bg-yellow-100 bg-white' : ''}
                            ${isEditing ? 'border-yellow-400 border-x-2' : ''}
                            ${!isEditing && data?.isSevere ? 'bg-pink-50' : ''}
                          `}
                          onClick={(e) => isEditing && handleCellClick(e, date, item)}
                        >
                          {displayVal}
                          {isDirty && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>}
                        </td>
                      );
                    })}
                  </tr>
                );

                return (
                  <>
                    <tr className="bg-blue-50 font-bold"><td className="bg-blue-50 p-2 border">A項目 (得点)</td>
                      {dateList.map(date => <td key={date} className={`border ${date===editingDate?'bg-yellow-50 border-yellow-400 border-x-2':''} ${monthlyData[date]?.isSevere?'bg-pink-50':''}`}>{(date===editingDate?tempAssessment:monthlyData[date])?.scores?.a ?? '-'}</td>)}
                    </tr>
                    {itemsByCategory.a.map(renderRow)}

                    <tr className="bg-green-50 font-bold"><td className="bg-green-50 p-2 border">B項目 (得点)</td>
                      {dateList.map(date => <td key={date} className={`border ${date===editingDate?'bg-yellow-50 border-yellow-400 border-x-2':''} ${monthlyData[date]?.isSevere?'bg-pink-50':''}`}>{(date===editingDate?tempAssessment:monthlyData[date])?.scores?.b ?? '-'}</td>)}
                    </tr>
                    {itemsByCategory.b.map(renderRow)}
                    
                     <tr className="bg-gray-100 font-bold"><td className="bg-gray-100 p-2 border">C項目 (得点)</td>
                      {dateList.map(date => <td key={date} className={`border ${date===editingDate?'bg-yellow-50 border-yellow-400 border-x-2':''} ${monthlyData[date]?.isSevere?'bg-pink-50':''}`}>{(date===editingDate?tempAssessment:monthlyData[date])?.scores?.c ?? '-'}</td>)}
                    </tr>
                  </>
                );
            })()}

            {/* 判定結果 */}
            <tr className="bg-gray-800 text-white font-bold">
              <td className="p-2 border border-gray-600 text-left bg-gray-800">判定結果</td>
              {dateList.map(date => {
                const isEditing = date === editingDate;
                const data = isEditing ? tempAssessment : monthlyData[date];
                if (!data) return <td key={date} className="border border-gray-600 bg-gray-100"></td>;
                
                return (
                  <td key={date} className={`border border-gray-600 ${data.isSevere ? 'bg-red-600' : 'bg-gray-700'}`}>
                    {data.isSevere ? '○' : '×'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Popup */}
      {popupState.isOpen && popupState.item && (
        <CellEditPopup 
          item={popupState.item}
          currentValue={tempAssessment?.items?.[popupState.item.id] as any} // Cast safely logic handled inside
          // Pass current assist value
          currentAssistValue={tempAssessment?.items?.[`${popupState.item.id}_assist`] as number | undefined}
          onSave={handleValueChange}
          onClose={() => setPopupState(prev => ({ ...prev, isOpen: false }))}
          position={popupState.position}
        />
      )}
    </div>
  );
};
