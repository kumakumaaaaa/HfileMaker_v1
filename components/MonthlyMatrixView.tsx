'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { DailyAssessment, ITEM_DEFINITIONS, NursingItemDefinition, Admission, Patient } from '../types/nursing';
import { getMonthlyAssessments, saveAssessment, deleteAssessment, getAdmissions, getPreviousDayAssessment, getPatients, savePatient } from '../utils/storage';
import { getPatientLocationAndStatus, getActiveAdmission } from '../utils/patientHelper';
import { evaluatePatient } from '../utils/evaluation';
import { CellEditPopup } from './CellEditPopup'; // Import popup
import { Edit2, Save, X, AlertCircle, Copy, Trash2, ChevronLeft, ChevronRight, User, Calendar, ArrowRight, Building2, BedDouble, Activity } from 'lucide-react'; // Icons

interface MonthlyMatrixViewProps {
  patientId: string;
  patient?: Patient;         // Optional: Pass patient object to avoid refetch
  admissions?: Admission[];  // Optional: Pass admissions to avoid refetch
  currentDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  lastUpdated?: number;
  onDirtyChange?: (isDirty: boolean) => void;
  onPatientRefresh?: () => void;
}

export const MonthlyMatrixView: React.FC<MonthlyMatrixViewProps> = ({ 
  patientId,
  patient: propPatient,
  admissions: propAdmissions,
  currentDate, 
  onDateSelect,
  lastUpdated,
  onDirtyChange,
  onPatientRefresh
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
  const [admissions, setAdmissions] = useState<Admission[]>(propAdmissions || []);
  const [patient, setPatient] = useState<Patient | undefined>(propPatient);

  // Memo Editing State
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [memoInput, setMemoInput] = useState('');

  // Load Patient & Admissions if not provided
  useEffect(() => {
    if (!propPatient) {
        const allPatients = getPatients();
        const found = allPatients.find(p => p.id === patientId);
        setPatient(found);
    } else {
        setPatient(propPatient);
    }
  }, [patientId, propPatient, lastUpdated]);

  useEffect(() => {
    if (!propAdmissions) {
        const allAdmissions = getAdmissions(patientId);
        setAdmissions(allAdmissions);
    } else {
        setAdmissions(propAdmissions);
    }
  }, [patientId, propAdmissions, lastUpdated]);


  // Helper: Check if date is valid (within any admission)
  const isValidDate = (date: string): boolean => {
    return !!getActiveAdmission(admissions, date);
  };
  
  // Helper: Month Navigation
  const handleMonthChange = (delta: number) => {
    if (editingDate) {
        if (!confirm('編集中のデータは破棄されますが、移動してもよろしいですか？')) return;
        setEditingDate(null);
        setPendingChanges({});
    }
    const newDate = new Date(year, month - 1 + delta, 1);
    const newDateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
    onDateSelect(newDateStr);
  };

  // Load Data (Merge assessments from all relevant admissions in this month)
  useEffect(() => {
    if (admissions.length === 0) {
        setMonthlyData({});
        return;
    }

    // Find admissions that potentially overlap with this month
    const startOfMonth = dateList[0];
    const endOfMonth = dateList[dateList.length - 1];

    const relevantAdmissions = admissions.filter(adm => {
        const start = adm.admissionDate;
        const end = adm.dischargeDate || '9999-12-31';
        return start <= endOfMonth && end >= startOfMonth;
    });

    let mergedData: Record<string, DailyAssessment> = {};
    relevantAdmissions.forEach(adm => {
        const data = getMonthlyAssessments(adm.id, yearMonth);
        mergedData = { ...mergedData, ...data };
    });
    
    setMonthlyData(mergedData);
  }, [admissions, yearMonth, lastUpdated]); // dateList is stable enough derived from yearMonth

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
    // 1. Future Check
    // 2. Admission Check (Dynamic)
    
    // Future check moved here for strictness
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (date > todayStr) {
        alert('未来の日付は編集できません。');
        return;
    }

    const admission = getActiveAdmission(admissions, date);
    if (!admission) {
        alert('この日付に該当する入院記録がありません。入院日を確認してください。');
        return;
    }

    if (editingDate && editingDate !== date) {
        if (!confirm('他の日の編集を破棄してこの日を編集しますか？')) return;
    }
    
    // Load current data or create empty template
    const current = monthlyData[date];
    const admissionFeeId = current?.admissionFeeId || 'acute_general_5'; // default
    const initialItems = current?.items ? { ...current.items } : {};
    
    // Initialize scores
    const { items, scoreA, scoreB, scoreC } = initialDataToState(initialItems, admissionFeeId);
    
    // ID generation
    const id = `${date}_${admission.id}`;

    const initialAssessment: DailyAssessment = {
      id,
      admissionId: admission.id,
      date,
      items,
      admissionFeeId,
      scores: { a: scoreA, b: scoreB, c: scoreC },
      isSevere: evaluatePatient(admissionFeeId, { items, scoreA, scoreB, scoreC })
    };

    setPendingChanges({ [date]: initialAssessment });
    setEditingDate(date);
    if (allItems.length > 0) {
      setFocusedItemId(allItems[0].id);
    }
  };

  // Copy from Previous Day
  const handleCopyPrevious = (targetDate: string) => {
      // Find valid admission for TARGET date?
      const admission = getActiveAdmission(admissions, targetDate);
      if (!admission) {
           alert('この日付は入院期間外です');
           return;
      }

      const idx = dateList.indexOf(targetDate);
      if (idx <= 0) {
          alert('前日のデータがありません');
          return;
      }
      const prevDate = dateList[idx - 1];
      
      // Try to get from loaded monthly data first (optimization)
      let prevData = monthlyData[prevDate];
      
      // If not in current month view (e.g. 1st of month), fetch from storage
      if (!prevData) {
           // We need PREVIOUS admission? Or assume same admission usually.
           // Actually, if crossing month boundary but same admission, getPreviousDayAssessment works if we pass admissionId.
           // If admission changed (e.g. re-admitted on 1st), prev day belongs to DIFFERENT admission?
           // getPreviousDayAssessment expects admissionId.
           // Since we want to copy data, maybe allow copying from *any* previous data?
           // But `getPreviousDayAssessment` signature requires admissionId.
           // Let's use `getAssessmentForDate` logic (manual fetch) to be robust?
           // Actually, `getPreviousDayAssessment` implementation subtracts 1 day.
           // So `getPreviousDayAssessment(admission.id, targetDate)` tries to find prev day record LINKED TO THIS ADMISSION.
           // If previous day was prior admission (or no admission), it returns null.
           // This is correct behavior: don't auto-copy across different admissions.
           
           const fetched = getPreviousDayAssessment(admission.id, targetDate); 
           if (fetched) prevData = fetched;
      }
      
      if (!prevData) {
          alert('前日のデータが登録されていません');
          return;
      }

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (targetDate > todayStr) {
          alert('未来の日付は編集できません。');
          return;
      }

      if (editingDate && editingDate !== targetDate) {
          if (!confirm('他の日の編集を破棄してこの日を編集しますか？')) return;
      }
      
      const newItems = { ...prevData.items };
      const { scoreA, scoreB, scoreC } = initialDataToState(newItems, prevData.admissionFeeId);
      
      const id = `${targetDate}_${admission.id}`;
      const newAssessment: DailyAssessment = {
          id,
          admissionId: admission.id,
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
    dates.forEach(date => {
        saveAssessment(pendingChanges[date]);
    });
    
    // Reload data logic update: re-fetch relevant admissions
    // Re-triggering the useEffect by updating 'lastUpdated' in parent or local force update?
    // Since we save to localStorage, but useEffect depends on [admissions, yearMonth, lastUpdated].
    // We can just locally update state for immediate feedback.
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
    
    // Notify parent to refresh list indicators
    onPatientRefresh?.();
  };

  // Delete Data
  const handleDelete = (date: string) => {
      if (!confirm(`${date} のデータを削除しますか？`)) return;
      
      const admission = getActiveAdmission(admissions, date);
      if (admission) {
          deleteAssessment(admission.id, date);
      } else {
          // If no admission for this date, maybe data is orphan or something, but we can't key it to delete properly with new logic.
          // But technically if there is data, there SHOULD be an admission ID in it?
          // monthlyData[date] has admissionId.
          const data = monthlyData[date];
          if (data && data.admissionId) {
               deleteAssessment(data.admissionId, date);
          }
      }
      
      setMonthlyData(prev => {
          const next = { ...prev };
          delete next[date];
          return next;
      });
      
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

  // Memo Handlers
  const handleStartMemoEdit = () => {
    if (editingDate) {
         if (!confirm('編集中のデータは破棄されますが、移動してもよろしいですか？')) return;
         setEditingDate(null);
         setPendingChanges({});
    }
    setMemoInput(patient?.memo || '');
    setIsEditingMemo(true);
  };

  const handleSaveMemo = () => {
    if (!patient) return;
    const updated = { ...patient, memo: memoInput };
    savePatient(updated);
    setPatient(updated); 
    setIsEditingMemo(false);
    onPatientRefresh?.();
  };

  return (
    <div className="flex flex-col h-full bg-white relative w-full overflow-hidden rounded-lg shadow border border-gray-200">
      
      {/* Header Section: Summary & Controls */}
      <div className="shrink-0 z-40 bg-white border-b border-gray-200 shadow-sm relative">
         {/* Top Row: Patient Summary */}
         {patient && (
            <div className={`px-6 py-4 flex items-start justify-between gap-6 ${patient.excludeFromAssessment ? 'bg-red-50' : 'bg-blue-50/30'}`}>
                <div className="flex-1 min-w-0">
                     <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
                         <div className="flex items-center gap-3">
                             <span className="text-4xl font-bold text-gray-900 tracking-tight">{patient.name}</span>
                             {patient.excludeFromAssessment && (
                                 <span className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded-full text-base font-bold shadow-sm animate-pulse">
                                     <AlertCircle className="w-5 h-5" /> 評価対象外
                                 </span>
                             )}
                         </div>
                         
                         <div className="flex flex-wrap items-center gap-3 text-lg text-gray-700 mt-2">
                             <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-300 font-bold text-gray-600 text-base">ID: {patient.identifier}</span>
                             
                             {/* Gender Visuals */}
                             {patient.gender === '1' && (
                                 <span className="flex items-center gap-1 text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded text-base">
                                     <User className="w-4 h-4" /> 男性
                                 </span>
                             )}
                             {patient.gender === '2' && (
                                 <span className="flex items-center gap-1 text-pink-700 font-bold bg-pink-100 px-2 py-0.5 rounded text-base">
                                     <User className="w-4 h-4" /> 女性
                                 </span>
                             )}
                             {patient.gender !== '1' && patient.gender !== '2' && (
                                 <span className="flex items-center gap-1 text-gray-700 font-bold bg-gray-200 px-2 py-0.5 rounded text-base">
                                     <User className="w-4 h-4" /> その他
                                 </span>
                             )}

                             <span className="text-base font-bold">{patient.birthDate}生</span>

                             {/* Inline Memo */}
                             <div className="flex items-center gap-2 flex-1 min-w-[300px] ml-2">
                                <div 
                                    className="flex items-center gap-1 font-bold text-orange-600 text-base cursor-pointer hover:bg-orange-50 rounded px-1 transition-colors shrink-0"
                                    onClick={handleStartMemoEdit}
                                    title="メモを編集"
                                >
                                    <Edit2 className="w-4 h-4" /> メモ:
                                </div>
                                {isEditingMemo ? (
                                    <div className="flex-1 flex gap-2">
                                        <input
                                            type="text"
                                            value={memoInput}
                                            onChange={(e) => setMemoInput(e.target.value)}
                                            className="flex-1 text-sm border border-orange-300 rounded px-2 py-1 focus:ring-2 focus:ring-orange-500 font-sans"
                                            autoFocus
                                            placeholder="メモを入力..."
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveMemo();
                                                if (e.key === 'Escape') setIsEditingMemo(false);
                                            }}
                                        />
                                        <button 
                                            onClick={handleSaveMemo}
                                            className="px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-xs font-bold whitespace-nowrap"
                                        >
                                            <Save className="w-3 h-3 inline mr-1" />保存
                                        </button>
                                        <button 
                                            onClick={() => setIsEditingMemo(false)}
                                            className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs font-bold whitespace-nowrap"
                                        >
                                            <X className="w-3 h-3 inline" />
                                        </button>
                                    </div>
                                ) : (
                                    <span 
                                        className="text-gray-800 text-base bg-yellow-50 border border-yellow-200 rounded px-2 py-0.5 truncate cursor-pointer hover:bg-yellow-100 transition-colors flex-1 max-w-2xl"
                                        onClick={handleStartMemoEdit}
                                        title={patient.memo || "クリックしてメモを追加"}
                                    >
                                        {patient.memo || <span className="text-gray-400 italic text-sm">メモなし</span>}
                                    </span>
                                )}
                             </div>
                         </div>
                     </div>
                     

                     {/* Compact Admission History */}
                     <div className="flex items-center gap-2 mt-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100 overflow-hidden">
                         <div className="flex items-center gap-1 font-bold text-blue-700 text-sm whitespace-nowrap">
                             <Calendar className="w-4 h-4" /> 入院歴:
                         </div>
                         <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                             {admissions.length > 0 ? (
                                 <>
                                    {admissions
                                        .sort((a, b) => b.admissionDate.localeCompare(a.admissionDate))
                                        .slice(0, 3)
                                        .map(adm => {
                                            const isActive = !adm.dischargeDate || adm.dischargeDate >= currentDate;
                                            return (
                                                <div 
                                                    key={adm.id} 
                                                    onClick={() => {
                                                        if (editingDate) {
                                                            if (!confirm('編集中のデータは破棄されますが、移動してもよろしいですか？')) return;
                                                            setEditingDate(null);
                                                            setPendingChanges({});
                                                        }
                                                        const [y, m] = adm.admissionDate.split('-');
                                                        onDateSelect(`${y}-${m}-01`);
                                                    }}
                                                    title="入院月に移動"
                                                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-sm cursor-pointer transition-colors whitespace-nowrap ${isActive ? 'bg-white border border-blue-300 text-blue-900 font-bold shadow-sm hover:bg-blue-50' : 'text-gray-500 hover:bg-gray-100'}`}
                                                >
                                                    <span className="font-mono">{adm.admissionDate}</span>
                                                    <ArrowRight className="w-3 h-3 text-gray-400" />
                                                    <span className="font-mono">{adm.dischargeDate || '継続'}</span>
                                                </div>
                                            );
                                        })}
                                    {admissions.length > 3 && (
                                        <span className="text-gray-500 text-xs font-bold">+{admissions.length - 3}</span>
                                    )}
                                 </>
                             ) : (
                                 <span className="text-gray-400 text-xs">なし</span>
                             )}
                         </div>
                     </div>
                </div>

                {/* Month Controller (Right Side - Prominent) */}
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border-2 border-blue-600 shadow-lg self-center shrink-0 ml-4">
                     <button 
                        onClick={() => handleMonthChange(-1)} 
                        className="p-2 hover:bg-blue-100 text-blue-700 rounded-full transition-colors" 
                        title="前月"
                     >
                         <ChevronLeft className="w-8 h-8" />
                     </button>
                     <div className="text-center min-w-[110px] flex flex-col items-center justify-center">
                         <div className="text-xl text-blue-600 font-extrabold tracking-tight leading-none mb-1">{year}年</div>
                         <div className="text-4xl font-black text-blue-800 leading-none tracking-normal" style={{ fontFeatureSettings: '"tnum"' }}>
                             {month}<span className="text-xl ml-1 font-bold text-blue-600">月</span>
                         </div>
                     </div>
                     <button 
                        onClick={() => handleMonthChange(1)} 
                        className="p-2 hover:bg-blue-100 text-blue-700 rounded-full transition-colors" 
                        title="次月"
                     >
                         <ChevronRight className="w-8 h-8" />
                     </button>
                </div>
            </div>
         )}
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-auto relative bg-gray-50/50">
        
        {/* Scrollable Container Content */}
        <div className="min-w-max"> 
        <table className="w-full text-base text-center border-separate border-spacing-0">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border border-gray-300 min-w-[300px] text-left bg-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] outline outline-1 outline-gray-300" 
                  style={{ position: 'sticky', top: 0, left: 0, zIndex: 60, background: '#f3f4f6' }}>項目 / 日付</th>
              {dateList.map((date, dateIdx) => {
                const day = parseInt(date.split('-')[2]);
                const isSelected = date === currentDate;
                const isEditing = date === editingDate;
                
                // Future calculation
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const isFuture = date > todayStr;

                // Admission Validity & Excluded Check
                const isValid = isValidDate(date);
                // CRITICAL UPDATE: Editing is disabled if patient is Excluded, even if date is valid
                const isEditable = isValid && !isFuture && !patient?.excludeFromAssessment;
                
                // Data
                const pending = pendingChanges[date];
                const stored = monthlyData[date];
                const data = pending || stored;
                const isPending = !!pending;
                const isSevere = data?.isSevere;
                
                // Excluded styling override
                const isExcluded = patient?.excludeFromAssessment;

                return (
                  <th 
                    key={date} 
                    className={`
                      p-2 border border-gray-300 min-w-[60px] transition-colors relative group
                      ${isExcluded ? 'bg-red-50' : ''}
                      ${isEditing ? 'bg-yellow-50 border-yellow-400 border-2 border-b-0' : ''}
                      ${!isEditing && isSelected ? 'bg-blue-600 text-white' : ''}
                      ${!isEditing && !isSelected && !isExcluded ? 'bg-gray-100 hover:bg-gray-200' : ''}
                      ${!isEditing && isSevere ? 'bg-pink-100 text-red-800' : ''}
                      ${!isEditable ? 'text-gray-400 cursor-not-allowed' : ''}
                      ${!isEditable && !isExcluded ? 'bg-gray-200' : ''} 
                    `}
                    style={{ position: 'sticky', top: 0, zIndex: 50 }}
                    onClick={() => !isEditing && isEditable && onDateSelect(date)}
                  >
                    <div className={`flex flex-col items-center gap-1 ${!isEditable ? 'opacity-50' : ''}`}>
                      <span>{day}</span>
                      {isEditing ? (
                         <div className="flex gap-1 z-50 relative items-center"> 
                           <button onClick={handleSaveEdit} className="p-1 bg-green-500 text-white rounded hover:bg-green-600" title="保存"><Save className="w-3 h-3"/></button>
                           <button onClick={handleCancelEdit} className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600" title="キャンセル"><X className="w-3 h-3"/></button>
                         </div>
                      ) : (
                        <div className="h-5 flex gap-1 items-center justify-center">
                             {/* Copy Previous Button */}
                             {dateIdx > 0 && !monthlyData[date] && isEditable && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleCopyPrevious(date); }}
                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="前日のデータをコピーして編集"
                                >
                                    <Copy className="w-3 h-3" />
                                </button>
                             )}
                             {/* Edit Button */}
                             {isEditable && (
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
                      
                      {isPending && !isEditing && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* --- Info Rows (Ward/Room/Status) --- */}
            <tr>
               <td className="p-2 border border-gray-300 font-bold text-gray-700 shadow-sm" style={{ position: 'sticky', left: 0, zIndex: 45, background: '#f3f4f6' }}>
                 <div className="flex items-center gap-2 pl-1">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">病棟</span>
                 </div>
               </td>
               {dateList.map(date => {
                 const { ward } = getPatientLocationAndStatus(admissions, date);
                 return (
                   <td key={date} className="border border-gray-300 p-2 text-center text-xs whitespace-nowrap bg-white text-gray-600">
                     {ward}
                   </td>
                 );
               })}
            </tr>
            <tr>
               <td className="p-2 border border-gray-300 font-bold text-gray-700 shadow-sm" style={{ position: 'sticky', left: 0, zIndex: 45, background: '#f3f4f6' }}>
                 <div className="flex items-center gap-2 pl-1">
                    <BedDouble className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">病室</span>
                 </div>
               </td>
               {dateList.map(date => {
                 const { room } = getPatientLocationAndStatus(admissions, date);
                 return (
                   <td key={date} className="border border-gray-300 p-2 text-center text-xs font-mono bg-white text-gray-600">
                     {room !== '-' ? `${room}` : '-'}
                   </td>
                 );
               })}
            </tr>
            <tr>
               <td className="p-2 border border-gray-300 font-bold text-gray-700 shadow-sm border-b-2 border-b-gray-300" style={{ position: 'sticky', left: 0, zIndex: 45, background: '#f3f4f6' }}>
                 <div className="flex items-center gap-2 pl-1">
                    <Activity className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">状況</span>
                 </div>
               </td>
               {dateList.map(date => {
                 const { status: rawStatus } = getPatientLocationAndStatus(admissions, date);
                 const status = rawStatus || '';
                 let statusColor = 'text-gray-400';
                 let bg = 'bg-white'; // default white
                 if (status === '入院') { statusColor = 'text-blue-600 font-bold'; bg = 'bg-blue-50'; }
                 if (status === '退院') { statusColor = 'text-red-600 font-bold'; bg = 'bg-red-50'; }
                 if (status.includes('転')) { statusColor = 'text-orange-600 font-bold'; bg = 'bg-orange-50'; }
                 if (status.includes('外泊')) { statusColor = 'text-purple-600 font-bold'; bg = 'bg-purple-50'; }
                 
                 return (
                   <td key={date} className={`border border-gray-300 border-b-2 border-b-gray-300 p-2 text-center text-xs whitespace-nowrap ${bg} ${statusColor}`}>
                     {status || '-'}
                   </td>
                 );
               })}
            </tr>

            {/* Rows Logic Helper */}
            {(() => {
                const renderRow = (item: NursingItemDefinition) => (
                   <tr key={item.id}>
                    <td className="p-2 border border-gray-300 text-left bg-white truncate max-w-[300px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] outline outline-1 outline-gray-300" title={item.label} 
                        style={{ position: 'sticky', left: 0, zIndex: 40, background: 'white' }}>
                      {item.label}
                    </td>
                    {dateList.map((date, dateIdx) => {

                      const isEditing = date === editingDate;
                      
                      // Also grey out cell if invalid
                      const isValid = isValidDate(date);
                      const now = new Date();
                      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                      const isFuture = date > todayStr;
                      const isEditable = isValid && !isFuture && !patient?.excludeFromAssessment; // Also check Excluded

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
                      
                      if (pending) {
                          const defaultVal = item.inputType === 'checkbox' ? false : 0;
                          
                          const pVal = pending.items?.[item.id] ?? defaultVal;
                          const sVal = stored?.items?.[item.id] ?? defaultVal;

                          if (pVal !== sVal) {
                              isDirty = true;
                          }
                          
                          if (!isDirty && item.category === 'b' && item.hasAssistance) {
                              const pAssist = pending.items?.[`${item.id}_assist`] ?? 1;
                              const sAssist = stored?.items?.[`${item.id}_assist`] ?? 1;
                              if (pAssist !== sAssist) isDirty = true;
                          }
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
                            ${!isEditable && !isEditing ? 'bg-gray-100' : ''}
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
