'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { DailyAssessment, ITEM_DEFINITIONS, NursingItemDefinition } from '../types/nursing';
import { getMonthlyAssessments, saveAssessment, deleteAssessment } from '../utils/storage';
import { evaluatePatient } from '../utils/evaluation';
import { CellEditPopup } from './CellEditPopup'; // Import popup
import { Edit2, Save, X, AlertCircle, Copy, Trash2 } from 'lucide-react'; // Icons

// ... Wait, I should do the util update first or inline it. 
// Let's look at `utils/storage.ts`.


interface MonthlyMatrixViewProps {
  patientId: string;
  currentDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  lastUpdated?: number;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const MonthlyMatrixView: React.FC<MonthlyMatrixViewProps> = ({ 
  patientId, 
  currentDate, 
  onDateSelect,
  lastUpdated,
  onDirtyChange
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
  const [pendingChanges, setPendingChanges] = useState<Record<string, DailyAssessment>>({});
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  
  // --- Dirty State & Patient Change Handling ---
  const isDirty = Object.keys(pendingChanges).length > 0 || !!editingDate;

  // Notify parent of dirty state
  useEffect(() => {
      onDirtyChange?.(isDirty);
      
      // Browser unload protection
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          if (isDirty) {
              e.preventDefault();
              e.returnValue = '';
          }
      };
      
      if (isDirty) {
          window.addEventListener('beforeunload', handleBeforeUnload);
      }
      
      return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
      };
  }, [isDirty, onDirtyChange]);

  // Reset editing on patient change
  useEffect(() => {
      setEditingDate(null);
      setPendingChanges({});
      setFocusedItemId(null);
      // We don't need to call onDirtyChange(false) here because the dependency above will trigger
      // but if we unmount we might want to ensure it's cleared.
  }, [patientId]);

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
        if (!confirm('他の日の編集を破棄してこの日を編集しますか？')) return;
    }
    
    // Load current data or create empty template
    const current = monthlyData[date];
    const admissionFeeId = current?.admissionFeeId || 'acute_general_5'; // default
    const initialItems = current?.items ? { ...current.items } : {};
    
    // Initialize scores
    const { items, scoreA, scoreB, scoreC } = initialDataToState(initialItems, admissionFeeId);
    
    const initialAssessment: DailyAssessment = {
      patientId,
      date,
      items,
      admissionFeeId,
      scores: { a: scoreA, b: scoreB, c: scoreC },
      isSevere: evaluatePatient(admissionFeeId, { items, scoreA, scoreB, scoreC })
    };

    setPendingChanges({ [date]: initialAssessment });
    setEditingDate(date);
    // Focus first item
    if (allItems.length > 0) {
      setFocusedItemId(allItems[0].id);
    }
  };

  // Copy from Previous Day
  const handleCopyPrevious = (targetDate: string) => {
      // Find previous date
      const idx = dateList.indexOf(targetDate);
      if (idx <= 0) {
          alert('前日のデータがありません');
          return;
      }
      const prevDate = dateList[idx - 1];
      const prevData = monthlyData[prevDate];
      
      if (!prevData) {
          alert('前日のデータが登録されていません');
          return;
      }

      if (editingDate && editingDate !== targetDate) {
          if (!confirm('他の日の編集を破棄してこの日を編集しますか？')) return;
      }
      
      // Deep copy previous data items
      const newItems = { ...prevData.items };
      // Copy assist values too? Yes, items includes them.
      
      const { scoreA, scoreB, scoreC } = initialDataToState(newItems, prevData.admissionFeeId);
      
      const newAssessment: DailyAssessment = {
          patientId,
          date: targetDate,
          items: newItems,
          admissionFeeId: prevData.admissionFeeId,
          scores: { a: scoreA, b: scoreB, c: scoreC },
          isSevere: evaluatePatient(prevData.admissionFeeId, { items: newItems, scoreA, scoreB, scoreC })
      };
      
      setPendingChanges({ [targetDate]: newAssessment });
      setEditingDate(targetDate);
      if (allItems.length > 0) {
          setFocusedItemId(allItems[0].id);
      }
  };

  // Cancel Editing
  const handleCancelEdit = () => {
    if (confirm('編集中の内容を破棄しますか？')) {
      setEditingDate(null);
      setPendingChanges({});
      setFocusedItemId(null);
      setPopupState({ isOpen: false, item: null, position: { x: 0, y: 0 } });
    }
  };

  // Save Editing
  const handleSaveEdit = () => {
    const dates = Object.keys(pendingChanges);
    // Since auto-fill is gone, multi-day save is rare (only if we manually supported it in code but logic limits to 1).
    // Just save all pending.

    // Save all pending
    dates.forEach(date => {
        saveAssessment(pendingChanges[date]);
    });
    
    // Force reload local by merging pending into monthly
    setMonthlyData(prev => {
        const next = { ...prev };
        dates.forEach(d => {
            next[d] = pendingChanges[d];
        });
        return next;
    });
    
    setEditingDate(null);
    setPendingChanges({});
    setFocusedItemId(null);
    setFocusedItemId(null);
  };

  // Delete Data
  const handleDelete = (date: string) => {
      if (!confirm(`${date} のデータを削除しますか？`)) return;
      
      deleteAssessment(patientId, date);
      
      // Update local state
      setMonthlyData(prev => {
          const next = { ...prev };
          delete next[date];
          return next;
      });
      
      // Close edit if needed
      if (editingDate === date) {
          handleCancelEdit();
      }
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
  }, [editingDate, focusedItemId, pendingChanges, allItems]); // Deps important

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
    // Current editing date is target
    if (!editingDate || !pendingChanges[editingDate] || !focusedItemId) return;
    
    // Use focusedItemId (source of truth) instead of popupState.item
    const newItemId = focusedItemId; 
    const itemDef = ITEM_DEFINITIONS.find(i => i.id === newItemId);
    if (!itemDef) return;

    // Get current pending data for the editing date
    const currentData = pendingChanges[editingDate];
    const newItems = { ...currentData.items, [newItemId]: val };
    
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
             const mult = (typeof av === 'number') ? av : 1;
             points = points * mult;
          }
          b += points;
       }
    });

    const isSevere = evaluatePatient(currentData.admissionFeeId, { items: newItems, scoreA: a, scoreB: b, scoreC: c });

    setPendingChanges(prev => ({
        ...prev,
        [editingDate]: {
            ...currentData,
            items: newItems,
            scores: { a, b, c },
            isSevere
        }
    }));
  };

  return (
    <div className="flex flex-col bg-white rounded-lg shadow mb-6 border border-gray-200 w-full overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          月間評価推移 ({year}年{month}月) 
          {editingDate && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded flex items-center gap-1"><Edit2 className="w-3 h-3"/> 編集中: {editingDate}</span>}
        </h2>
      </div>
      
      {/* Scrollable Container */}
      <div className="w-full overflow-x-auto max-h-[80vh]"> 
        <table className="w-full text-xs text-center border-separate border-spacing-0">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border border-gray-300 min-w-[200px] text-left bg-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] outline outline-1 outline-gray-300" 
                  style={{ position: 'sticky', top: 0, left: 0, zIndex: 60, background: '#f3f4f6' }}>項目 / 日付</th>
              {dateList.map((date, dateIdx) => {
                const day = parseInt(date.split('-')[2]);
                const isSelected = date === currentDate;
                const isEditing = date === editingDate;
                
                // Future check
                const todayStr = new Date().toISOString().split('T')[0];
                const isFuture = date > todayStr;
                
                // Data flow: pending -> stored
                const pending = pendingChanges[date];
                const stored = monthlyData[date];
                const data = pending || stored;
                const isPending = !!pending;
                const isSevere = data?.isSevere;
                
                return (
                  <th 
                    key={date} 
                    className={`
                      p-2 border border-gray-300 min-w-[60px] transition-colors relative group
                      ${isEditing ? 'bg-yellow-50 border-yellow-400 border-2 border-b-0' : ''}
                      ${!isEditing && isSelected ? 'bg-blue-600 text-white' : ''}
                      ${!isEditing && !isSelected ? 'bg-gray-100 hover:bg-gray-200' : ''}
                      ${!isEditing && isSevere ? 'bg-pink-100 text-red-800' : ''}
                      ${isFuture ? 'bg-gray-50 cursor-not-allowed' : ''}
                    `}
                    style={{ position: 'sticky', top: 0, zIndex: 50 }}
                    onClick={() => !isEditing && !isFuture && onDateSelect(date)}
                  >
                    <div className={`flex flex-col items-center gap-1 ${isFuture ? 'opacity-50' : ''}`}>
                      <span>{day}</span>
                      {isEditing ? (
                         <div className="flex gap-1 z-50 relative items-center"> 
                           <button onClick={handleSaveEdit} className="p-1 bg-green-500 text-white rounded hover:bg-green-600" title="保存"><Save className="w-3 h-3"/></button>
                           <button onClick={handleCancelEdit} className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600" title="キャンセル"><X className="w-3 h-3"/></button>
                         </div>
                      ) : (
                        <div className="h-5 flex gap-1 items-center justify-center">
                             {/* Copy Previous Button - Only if NO data for current date AND not future */}
                             {dateIdx > 0 && !monthlyData[date] && !isFuture && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleCopyPrevious(date); }}
                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="前日のデータをコピーして編集"
                                >
                                    <Copy className="w-3 h-3" />
                                </button>
                             )}
                             {/* Edit Button */}
                             {!isFuture && (
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); handleStartEdit(date); }}
                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="編集"
                                 >
                                    <Edit2 className="w-3 h-3" />
                                 </button>
                             )}
                        </div>
                      )}
                      
                      {/* Pending Indicator */}
                      {isPending && !isEditing && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
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
                    <td className="p-2 border border-gray-300 text-left bg-white truncate max-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] outline outline-1 outline-gray-300" title={item.label} 
                        style={{ position: 'sticky', left: 0, zIndex: 40, background: 'white' }}>
                      {item.label}
                    </td>
                    {dateList.map((date, dateIdx) => {
                      // ... (existing logic)
                      const isEditing = date === editingDate;
                      
                      // Data
                      const pending = pendingChanges[date];
                      const stored = monthlyData[date];
                      const data = pending || stored;
                      
                      const val = data?.items?.[item.id];
                      // Checkbox logic
                      let displayVal: React.ReactNode = '';
                      if (item.inputType === 'checkbox') {
                          if (val === true) displayVal = <span className="text-blue-600 font-bold">●</span>;
                      } else {
                          // B items - simple number for matrix
                          if (typeof val === 'number') displayVal = val;
                      }

                      // Dirty check (compare pending to stored)
                      let isDirty = false;
                      if (pending && stored) {
                          isDirty = true; 
                      } else if (pending && !stored) {
                          isDirty = true; // New data
                      }
                      
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
                
                // Helper for score rows
                const renderScoreRow = (label: string, category: 'a'|'b'|'c', bgClass: string) => (
                    <tr className={`${bgClass} font-bold`}>
                        <td className={`${bgClass} p-2 border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]`} 
                            style={{ position: 'sticky', left: 0, zIndex: 40 }}>{label}</td>
                        {dateList.map((date, dateIdx) => {
                             const pending = pendingChanges[date];
                             const stored = monthlyData[date];
                             const data = pending || stored;
                             const isEditing = date === editingDate;
                             
                             return (
                                 <td key={date} className={`border ${isEditing?'bg-yellow-50 border-yellow-400 border-x-2':''} ${!isEditing && data?.isSevere ?'bg-pink-50':''}`}>
                                     {data?.scores?.[category] ?? '-'}
                                 </td>
                             );
                        })}
                    </tr>
                );

                return (
                  <>
                    {renderScoreRow('A項目 (得点)', 'a', 'bg-blue-50')}
                    {itemsByCategory.a.map(renderRow)}

                    {renderScoreRow('B項目 (得点)', 'b', 'bg-green-50')}
                    {itemsByCategory.b.map(renderRow)}
                    
                    {renderScoreRow('C項目 (得点)', 'c', 'bg-gray-100')}
                    {itemsByCategory.c.map(renderRow)}
                  </>
                );
            })()}

            {/* 判定結果 */}
            <tr className="bg-gray-800 text-white font-bold">
              <td className="p-2 border border-gray-600 text-left bg-gray-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] outline outline-1 outline-gray-600" 
                  style={{ position: 'sticky', left: 0, zIndex: 40, background: '#1f2937', color: 'white' }}>判定結果</td>
              {dateList.map((date, dateIdx) => {
                const pending = pendingChanges[date];
                 const stored = monthlyData[date];
                 const data = pending || stored;
                 
                if (!data) return <td key={date} className="border border-gray-600 bg-gray-100"></td>;
                
                const isEditing = date === editingDate;
                if (isEditing) {
                    return (
                        <td key={date} className="border border-gray-600 bg-gray-700">
                             <button 
                                onClick={() => handleDelete(date)}
                                className="text-red-400 hover:text-red-200 p-1"
                                title="データを削除"
                             >
                                 <Trash2 className="w-4 h-4" />
                             </button>
                        </td>
                    );
                }

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
      {popupState.isOpen && popupState.item && pendingChanges[editingDate!] && (
        <CellEditPopup 
          item={popupState.item}
          currentValue={pendingChanges[editingDate!]?.items?.[popupState.item.id] as any} 
          currentAssistValue={pendingChanges[editingDate!]?.items?.[`${popupState.item.id}_assist`] as number | undefined}
          onSave={handleValueChange}
          onClose={() => setPopupState(prev => ({ ...prev, isOpen: false }))}
          position={popupState.position}
        />
      )}
    </div>
  );
};
