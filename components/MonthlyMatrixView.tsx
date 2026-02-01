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
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  
  // Popover State
  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    item: NursingItemDefinition | null;
    position: { x: number; y: number };
  }>({ isOpen: false, item: null, position: { x: 0, y: 0 } });

  // Helper: Get linear list of all items for navigation
  const allItems = useMemo(() => [
    ...itemsByCategory.a,
    ...itemsByCategory.b,
    ...itemsByCategory.c
  ], [itemsByCategory]);

  // Helper to calculate initial scores from item data
  const initialDataToState = (items: Record<string, boolean | number>, feeId: string) => {
     let a = 0, b = 0, c = 0;
     ITEM_DEFINITIONS.forEach(def => {
       const v = items[def.id];
       if (def.category === 'a' && v === true) a += def.points;
       if (def.category === 'c' && v === true) c += def.points;
       if (def.category === 'b' && typeof v === 'number') {
           let pts = v;
           if (def.hasAssistance) {
               const av = items[`${def.id}_assist`];
               pts = pts * ((typeof av === 'number') ? av : 1);
           }
           b += pts;
       }
     });
     return { items, scoreA: a, scoreB: b, scoreC: c };
  }

  // Start Editing
  const handleStartEdit = (date: string) => {
    if (editingDate && editingDate !== date) {
      if (!confirm('現在編集中のデータを破棄して別の日の編集を開始しますか？')) return;
    }
    
    // Load current data or create empty template
    const current = monthlyData[date];
    const admissionFeeId = current?.admissionFeeId || 'acute_general_5'; // default
    const initialItems = current?.items ? { ...current.items } : {};
    
    // Initialize scores
    const { items, scoreA, scoreB, scoreC } = initialDataToState(initialItems, admissionFeeId);
    
    setTempAssessment({
      patientId,
      date,
      items,
      admissionFeeId,
      scores: { a: scoreA, b: scoreB, c: scoreC },
      isSevere: evaluatePatient(admissionFeeId, { items, scoreA, scoreB, scoreC })
    });
    setEditingDate(date);
    // Focus first item
    if (allItems.length > 0) {
      setFocusedItemId(allItems[0].id);
    }
  };

  // Cancel Editing
  const handleCancelEdit = () => {
    if (confirm('編集中の内容を破棄しますか？')) {
      setEditingDate(null);
      setTempAssessment(null);
      setFocusedItemId(null);
      setPopupState({ isOpen: false, item: null, position: { x: 0, y: 0 } });
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
    // If parent sync is needed later, add callback prop.
    // setLastUpdated(Date.now());
    
    setEditingDate(null);
    setTempAssessment(null);
    setFocusedItemId(null);
  };

  // --- Keyboard & Focus Logic ---
  
  // Effect to sync Popup with Focused Item
  useEffect(() => {
      if (!editingDate || !focusedItemId) {
          setPopupState(prev => ({ ...prev, isOpen: false }));
          return;
      }
      
      const item = ITEM_DEFINITIONS.find(i => i.id === focusedItemId);
      if (!item) return;

      // Find the cell element using data attributes
      const cell = document.querySelector(`[data-cell-date="${editingDate}"][data-cell-item="${focusedItemId}"]`);
      if (cell) {
        const rect = cell.getBoundingClientRect();
        const popupWidth = 320;
        let x = rect.right + 10;
        let y = rect.top + window.scrollY; 
        if (x + popupWidth > window.innerWidth) {
            x = rect.left - popupWidth - 10;
        }
        
        setPopupState({
            isOpen: true,
            item,
            position: { x, y }
        });
        
        // Scroll into view if needed (smooth)
        cell.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
  }, [focusedItemId, editingDate]);


  // Keydown Handler
  useEffect(() => {
    if (!editingDate) return;

    const handleKeyDown = (e: KeyboardEvent) => {
        // Allow standard shortcuts (Cmd+R etc)
        if (e.metaKey || e.ctrlKey) return;

        // Navigation
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            moveFocus(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            moveFocus(-1);
        } else if (['0', '1', '2'].includes(e.key)) {
            // Numeric Input
            // Only capture if focused item accepts this input
            if (focusedItemId) {
                const item = ITEM_DEFINITIONS.find(i => i.id === focusedItemId);
                if (item) {
                     const val = parseInt(e.key);
                     e.preventDefault();
                     
                     // Validate input for item type
                     if (item.options) {
                         // Check if value exists in options
                         const opt = item.options.find(o => o.value === val);
                         if (opt) {
                             applyValueAndAdvance(item, val);
                             return;
                         }
                     } else if (item.inputType === 'checkbox') {
                         // 1 = True, 0 = False
                         if (val === 1) applyValueAndAdvance(item, true);
                         if (val === 0) applyValueAndAdvance(item, false);
                         return;
                     }
                }
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingDate, focusedItemId, tempAssessment, allItems]); // Deps important

  const moveFocus = (delta: number) => {
      if (!focusedItemId) return;
      const idx = allItems.findIndex(i => i.id === focusedItemId);
      if (idx === -1) return;
      
      const newIdx = idx + delta;
      if (newIdx >= 0 && newIdx < allItems.length) {
          setFocusedItemId(allItems[newIdx].id);
      }
  };

  const applyValueAndAdvance = (item: NursingItemDefinition, val: number | boolean) => {
      // Default assist to 1 (Yes) when typing value directly (unless value is 0, which is naturally 0 pts)
      // Actually handleValueChange takes care of logic, we just pass default assist.
      // If user wants Assist=No (0 pts), they likely pressed '0' (which is value 0). 
      // If item is 'Transfer', 1 = Partial. If I press '1', I mean Partial(1pt). So Assist must be 1.
      handleValueChange(val, 1);
      moveFocus(1);
  }

  // Cell Click (Set Focus)
  const handleCellClick = (e: React.MouseEvent, date: string, item: NursingItemDefinition) => {
    if (editingDate !== date) {
        if (date !== currentDate) onDateSelect(date);
        return;
    }
    setFocusedItemId(item.id);
    // Effect will open popup
  };

  // Update Value from Popup
  const handleValueChange = (val: boolean | number, assistVal?: number) => {
    if (!tempAssessment || !focusedItemId) return;
    
    // Use focusedItemId (source of truth) instead of popupState.item
    const newItemId = focusedItemId; 
    const itemDef = ITEM_DEFINITIONS.find(i => i.id === newItemId);
    if (!itemDef) return;

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
             const mult = (typeof av === 'number') ? av : 1; // Default to 1 (Yes) if undefined
             points = points * mult;
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
    <div className="bg-white rounded-lg shadow mb-6 border border-gray-200 inline-block min-w-full">
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
              <th className="p-2 border border-gray-300 min-w-[300px] text-left bg-gray-100">項目 / 日付</th>
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
                    <td className="p-2 border border-gray-300 text-left bg-white truncate max-w-[300px]" title={item.label}>
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
                      const isFocused = isEditing && focusedItemId === item.id;

                      return (
                        <td 
                          key={date} 
                          // Data attributes for locating cell for popup
                          data-cell-date={date}
                          data-cell-item={item.id}
                          className={`
                            border border-gray-300 relative
                            ${isEditing ? 'cursor-pointer' : ''}
                            ${isEditing && !isFocused ? 'bg-white hover:bg-yellow-50' : ''}
                            ${isFocused ? 'bg-yellow-200 outline outline-2 outline-blue-500 z-10' : ''} 
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
