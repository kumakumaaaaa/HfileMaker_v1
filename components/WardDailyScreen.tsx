import React, { useState, useEffect, useMemo } from 'react';
import { ITEM_DEFINITIONS, NursingItemDefinition, Patient, Admission, Ward, Room, DailyAssessment } from '../types/nursing';
import { getWards, getRooms, getPatients, getAdmissions, getMonthlyAssessments, saveAssessment, getPreviousDayAssessment } from '../utils/storage';
import { getPatientLocationAndStatus } from '../utils/patientHelper';
import { Calendar, Building2, BedDouble, Search, Save, Loader2, AlertCircle, Copy } from 'lucide-react';
import { evaluatePatient, calculateScores } from '../utils/evaluation';
import { CellEditPopup } from './CellEditPopup';
import { ExternalLink, Check } from 'lucide-react';

interface WardDailyScreenProps {
    onNavigateToPatient?: (patientId: string) => void;
}

export const WardDailyScreen: React.FC<WardDailyScreenProps> = ({ onNavigateToPatient }) => {
    // --- Filter State ---
    const getLocalDateString = (d: Date = new Date()) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const [targetDate, setTargetDate] = useState(getLocalDateString());
    const [selectedWard, setSelectedWard] = useState<string>('');
    const [selectedRooms, setSelectedRooms] = useState<string[]>([]); // Multi-select
    const [isRoomFilterOpen, setIsRoomFilterOpen] = useState(false); // For custom dropdown

    // --- Master Data ---
    const [wards, setWards] = useState<Ward[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    
    useEffect(() => {
        setWards(getWards());
        setRooms(getRooms());
        // Default to first ward if available and not set
        const w = getWards();
        if (w.length > 0 && !selectedWard) {
            setSelectedWard(w[0].code);
            // Default select all rooms? Or none for "All"? 
            // Let's default to empty = All
            setSelectedRooms([]);
        }
    }, []);

    const filteredRooms = useMemo(() => {
        return rooms.filter(r => r.wardCode === selectedWard);
    }, [rooms, selectedWard]);

    // --- Data State ---
    const [isLoading, setIsLoading] = useState(false);
    const [displayedPatients, setDisplayedPatients] = useState<{
        patient: Patient;
        admission: Admission;
        ward: string | null;
        room: string | null;
        status: string | null;
    }[]>([]);
    
    const [assessments, setAssessments] = useState<Record<string, DailyAssessment>>({}); // Key: admissionId
    const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({}); // Key: admissionId
    const [isCopyConfirmOpen, setIsCopyConfirmOpen] = useState(false);

    // --- Popup State ---
    const [focusedCell, setFocusedCell] = useState<{ admissionId: string; item: NursingItemDefinition } | null>(null);
    const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);

    // Effect to calculate popup position when focusedCell changes
    useEffect(() => {
        if (!focusedCell) {
            setPopupPosition(null);
            return;
        }
        
        // Find cell element
        const cell = document.querySelector(`[data-cell-adm="${focusedCell.admissionId}"][data-cell-item="${focusedCell.item.id}"]`);
        if (cell) {
            const rect = cell.getBoundingClientRect();
            // Position popup BELOW the cell (aligned left)
            let x = rect.left;
            let y = rect.bottom + window.scrollY;
            
            // Boundary checks
            // If it goes off right edge
            if (x + 320 > window.innerWidth) {
                x = window.innerWidth - 325;
            }
            // If it goes off bottom edge? (Maybe flip up? nice to have but simple first)
            
            setPopupPosition({ x, y });
        }
    }, [focusedCell]);

    // --- Search Logic ---
    const handleSearch = () => {
        setIsLoading(true);
        // Simulate slight delay for UI feedback
        setTimeout(() => {
            const allPatients = getPatients();
            const allAdmissions = getAdmissions(null);

            const results: typeof displayedPatients = [];
            const loadedAssessments: Record<string, DailyAssessment> = {};

            allPatients.forEach(patient => {
                // Find valid admission for date
                const patientAdmissions = allAdmissions.filter(a => a.patientId === patient.id);
                // We need to pass the specific patient's admissions to helper
                const { ward, room, status } = getPatientLocationAndStatus(patientAdmissions, targetDate);

                // Filter Logic
                // 1. Must have location (admitted)
                // 2. Must match Ward
                // 3. If Room selected, must match Room
                if (!ward) return; // Not admitted (or '退院' on previous day etc)
                
                // Allow '退院' status? Usually yes if they were there part of the day.
                // getPatientLocationAndStatus returns ward even on discharge day.
                
                // Ward Check using Code? Wait, helper returns NAME usually if not ID?
                // Actually `getPatientLocationAndStatus` returns values from `initialWard` or `movement.ward`.
                // These are likely Names if saved as names, or Codes if saved as codes.
                // In `PatientEditForm`, we saved Names? Or Codes?
                // Let's assume we need to match fuzzy or exact. 
                // Ideally we should have saved Codes.
                // Looking at `types/nursing.ts` or `PatientEditForm` might reveal.
                // The select box value in EditForm was likely binding to `ward` string.
                // If it was bound to `ward.name`, we compare name.
                // If bound to code, code. 
                // Let's fetch the relevant admission object to get the ID.
                
                const activeAdm = patientAdmissions.find(a => 
                    a.admissionDate <= targetDate && (!a.dischargeDate || a.dischargeDate >= targetDate)
                );
                
                if (!activeAdm) return;

                // Match Ward
                // If stored data uses Names, we might need to find the Ward Name for the selected Code.
                // Let's verify this assumption later. For now, try to match `ward` string with selectedWard (code) OR selectedWardName.
                const wardMaster = wards.find(w => w.code === selectedWard);
                const wardName = wardMaster?.name || '';

                // Loose matching: If stored ward matches Name or Code
                const isWardMatch = ward === wardName || ward === selectedWard;
                
                if (!isWardMatch) return;

                if (selectedRooms.length > 0) {
                    // Room matching
                    // If room is empty/null but filter is active, exclude?
                    // Usually if filter is active, unassigned patients are hidden unless "No Room" is an option.
                    // For now, match against selected room codes.
                    // We assume `room` variable holds the Room Name.
                    // But `selectedRooms` holds Codes.
                    // We need to resolve Room Code from `room` Name? Or simpler:
                    // If `room` matches ANY of the selected room names.
                    
                    // Resolve selected codes to names for comparison
                    const selectedRoomNames = rooms.filter(r => selectedRooms.includes(r.code)).map(r => r.name);
                    
                    const isRoomMatch = room && selectedRoomNames.includes(room);
                    if (!isRoomMatch) return;
                }

                results.push({
                    patient,
                    admission: activeAdm,
                    ward,
                    room,
                    status
                });

                // Load Assessment
                // We need to fetch for this specific date.
                // storage.ts has `getMonthlyAssessments`. It returns a map by YYYY-MM-DD.
                const yyyy = targetDate.split('-')[0];
                const mm = targetDate.split('-')[1];
                const monthKey = `${yyyy}-${mm}`;
                const monthly = getMonthlyAssessments(activeAdm.id, monthKey);
                
                if (monthly[targetDate]) {
                    loadedAssessments[activeAdm.id] = monthly[targetDate];
                } else {
                    // Initialize empty if not found
                    loadedAssessments[activeAdm.id] = {
                        id: `${targetDate}_${activeAdm.id}`,
                        admissionId: activeAdm.id,
                        date: targetDate,
                        admissionFeeId: 'acute_general_5', // Default for now
                        items: {},
                        scores: { a: 0, b: 0, c: 0 },
                        isSevere: false
                    };
                }
            });
            
            // Sort by Room, then Patient Identifier
            results.sort((a, b) => {
                if (a.room !== b.room) return (a.room || '').localeCompare(b.room || '');
                return (a.patient.identifier || '').localeCompare(b.patient.identifier || '');
            });

            setDisplayedPatients(results);
            setAssessments(loadedAssessments);
            setDirtyMap({});
            setIsLoading(false);
        }, 100);
    };

    // Initial Search on mount (if ward selected)
    useEffect(() => {
        if (selectedWard) {
            handleSearch();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Bulk Copy Logic ---
    const handleCopyPreviousDay = () => {
        setIsCopyConfirmOpen(true);
    };

    const executeCopyPreviousDay = () => {
        setIsCopyConfirmOpen(false);
        setIsLoading(true);
        setTimeout(() => {
            let copyCount = 0;
            const updates: Record<string, DailyAssessment> = {};
            const newDirtyMap: Record<string, boolean> = { ...dirtyMap };

            displayedPatients.forEach(row => {
                // Check safety conditions before copy
                const isOvernight = row.status?.includes('外泊');
                const isExcluded = row.patient.excludeFromAssessment;
                if (isOvernight || isExcluded) return;

                const prevData = getPreviousDayAssessment(row.admission.id, targetDate);
                if (prevData) {
                    // Create new assessment based on previous
                    // Recalculate Severity just in case
                    const scores = calculateScores(prevData.items);
                    const isSevere = evaluatePatient('acute_general_5', { items: prevData.items, scoreA: scores.a, scoreB: scores.b, scoreC: scores.c });

                    updates[row.admission.id] = {
                        id: `${targetDate}_${row.admission.id}`,
                        admissionId: row.admission.id,
                        date: targetDate,
                        admissionFeeId: prevData.admissionFeeId || 'acute_general_5',
                        items: { ...prevData.items },
                        scores: scores,
                        isSevere: isSevere
                    };
                    newDirtyMap[row.admission.id] = true;
                    copyCount++;
                }
            });

            if (copyCount > 0) {
                setAssessments(prev => ({ ...prev, ...updates }));
                setDirtyMap(newDirtyMap);
                alert(`${copyCount}件のデータをコピーしました。内容を確認して「一括保存」してください。`);
            } else {
                alert('コピー可能な前日データが見つかりませんでした。');
            }
            setIsLoading(false);
        }, 100);
    };

    // --- Focus & Keyboard Logic ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!focusedCell) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            // Navigation
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveFocus(-1, 0);
            } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                e.preventDefault();
                moveFocus(1, 0);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                moveFocus(0, -1);
            } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
                e.preventDefault();
                moveFocus(0, 1);
            } else if (['0', '1', '2'].includes(e.key)) {
                // Numeric Input
                // Check if item accepts input
                const { admissionId, item } = focusedCell;
                const val = parseInt(e.key);
                
                // Allow input if no popup is strictly blocking (though we might close popup on type)
                // For B-items (popup), maybe we shouldn't allow direct number input unless it's a simple score?
                // But MonthlyMatrixView allows it.
                // Exception: Checkbox items (1/0)
                
                if (item.inputType === 'checkbox') {
                     e.preventDefault();
                     if (val === 1) applyValueAndAdvance(1);
                     if (val === 0) applyValueAndAdvance(0);
                } else {
                    // For number inputs OR items with options (B items), allow direct input if it matches valid logic
                    // Usually B items are 0, 1, 2.
                    // If item has options, we can check if 'val' is a valid option value?
                    // Or just blindly allow 0,1,2 as they are standard scores.
                    // Let's allow it.
                    e.preventDefault();
                    applyValueAndAdvance(val);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [focusedCell, displayedPatients]);

    const moveFocus = (rowDelta: number, colDelta: number) => {
        if (!focusedCell) return;
        
        // Find current indices
        const currentRowIdx = displayedPatients.findIndex(p => p.admission.id === focusedCell.admissionId);
        const currentColIdx = ITEM_DEFINITIONS.findIndex(i => i.id === focusedCell.item.id);
        
        if (currentRowIdx === -1 || currentColIdx === -1) return;

        let nextRowIdx = currentRowIdx + rowDelta;
        let nextColIdx = currentColIdx + colDelta;

        // Boundary checks
        if (nextRowIdx < 0) nextRowIdx = 0;
        if (nextRowIdx >= displayedPatients.length) nextRowIdx = displayedPatients.length - 1;
        
        if (nextColIdx < 0) {
            // Wrap to previous row's last item? Or stop?
            // Let's stop at edge for now
            nextColIdx = 0;
        }
        if (nextColIdx >= ITEM_DEFINITIONS.length) {
            nextColIdx = ITEM_DEFINITIONS.length - 1;
        }
        
        // Skip rows that are not editable?
        // Current requirements don't explicitly say we must skip, but it's good UX.
        // displayedPatients includes excluded/overnight patients.
        // Let's just focus them, visual indication shows they are read-only.
        
        const nextPatient = displayedPatients[nextRowIdx];
        const nextItem = ITEM_DEFINITIONS[nextColIdx];
        
        setFocusedCell({
            admissionId: nextPatient.admission.id,
            item: nextItem
        });
    };

    const applyValueAndAdvance = (val: number) => {
        if (!focusedCell) return;
        
        // Check editability logic again
        const row = displayedPatients.find(p => p.admission.id === focusedCell.admissionId);
        if (!row) return;
        
        const isOvernight = row.status?.includes('外泊');
        const isExcluded = row.patient.excludeFromAssessment;
        const isFuture = targetDate > getLocalDateString();
        if (isFuture || isExcluded || isOvernight) return;

        handleValueChange(focusedCell.admissionId, focusedCell.item.id, val);
        // Move to next row (Enter-like behavior) or next col?
        // User requested: Input -> Slide Right (Next Item)
        moveFocus(0, 1); 
    };

    // --- Editing Logic ---
    const handleValueChange = (admissionId: string, itemId: string, value: number | null, assistValue?: number) => {
        setAssessments(prev => {
            const current = prev[admissionId];
            const newItems = { ...current.items, [itemId]: value };
            
            // Clean up if value is null (optional, or explicit null)
            if (value === null) {
                // Keep explicitly null to indicate unset if needed, or remove key?
                // Type allows null. Let's keep null.
            }
            
            // Update assistance if provided
            if (typeof assistValue === 'number') {
                newItems[`${itemId}_assist`] = assistValue;
            }

            // Recalculate Severity & Scores
            const scores = calculateScores(newItems);
            // evaluatePatient needs NursingAssessment type inputs
            // We can just check severity using the scores logic inside evaluatePatient which repeats calculation, 
            // OR use the scores (if evaluatePatient supports passing pre-calc scores).
            // `evaluatePatient` logic: const scoreA = assessment.scoreA ?? calculatedScoreA;
            // So if we pass scores in assessment object, it uses them.
            
            const tempAssessment: any = { 
                items: newItems,
                scoreA: scores.a, 
                scoreB: scores.b, 
                scoreC: scores.c 
            };
            const isSevereResult = evaluatePatient('acute_general_5', tempAssessment);
            
            return {
                ...prev,
                [admissionId]: {
                    ...current,
                    items: newItems,
                    scores: scores,
                    isSevere: isSevereResult
                }
            };
        });
        setDirtyMap(prev => ({ ...prev, [admissionId]: true }));
    };

    const handleSaveAll = () => {
        const dirtyIds = Object.keys(dirtyMap).filter(id => dirtyMap[id]);
        if (dirtyIds.length === 0) return;

        if (!confirm(`${dirtyIds.length}件の変更を保存しますか？`)) return;

        dirtyIds.forEach(id => {
            const data = assessments[id];
            saveAssessment(data);
        });

        setDirtyMap({});
        alert('保存しました');
    };

    // --- UI Helpers ---
    const itemsGrouped = useMemo(() => {
        return {
            a: ITEM_DEFINITIONS.filter(i => i.category === 'a'),
            b: ITEM_DEFINITIONS.filter(i => i.category === 'b'),
            c: ITEM_DEFINITIONS.filter(i => i.category === 'c'),
        };
    }, []);

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* --- Filter Header --- */}
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center gap-4 shrink-0">
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-gray-300 shadow-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-bold text-gray-700">対象日:</span>
                    <input 
                        type="date" 
                        value={targetDate} 
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="text-sm font-mono border-none focus:ring-0 p-0"
                    />
                </div>

                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-gray-300 shadow-sm">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-bold text-gray-700">病棟:</span>
                    <select 
                        value={selectedWard} 
                        onChange={(e) => setSelectedWard(e.target.value)}
                        className="text-sm border-none focus:ring-0 p-0 w-32"
                    >
                        <option value="">選択してください</option>
                        {wards.map(w => (
                            <option key={w.code} value={w.code}>{w.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-gray-300 shadow-sm relative">
                    <BedDouble className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-bold text-gray-700">病室:</span>
                    
                    {/* Custom Multi-Select Dropdown Trigger */}
                    <button 
                        onClick={() => setIsRoomFilterOpen(!isRoomFilterOpen)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 min-w-[100px] text-left flex items-center justify-between bg-white hover:bg-gray-50"
                    >
                        <span className="truncate max-w-[120px]">
                            {selectedRooms.length === 0 ? '全て' : `${selectedRooms.length}室選択中`}
                        </span>
                        <span className="text-xs text-gray-400">▼</span>
                    </button>

                    {/* Dropdown Menu */}
                    {isRoomFilterOpen && (
                        <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto bg-white border border-gray-200 shadow-xl rounded z-50 p-2">
                             <div 
                                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer border-b border-gray-100"
                                onClick={() => {
                                    if (selectedRooms.length === filteredRooms.length) {
                                        setSelectedRooms([]); // Deselect all (equals All effectively? No, explicit empty means All in our logic)
                                    } else {
                                        setSelectedRooms(filteredRooms.map(r => r.code));
                                    }
                                }}
                             >
                                <span className={`w-4 h-4 border rounded flex items-center justify-center ${selectedRooms.length === filteredRooms.length ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                    {selectedRooms.length === filteredRooms.length && <Check className="w-3 h-3 text-white" />}
                                </span>
                                <span className="text-sm font-bold">全て選択 / 解除</span>
                             </div>

                             {filteredRooms.map(r => {
                                 const isSelected = selectedRooms.includes(r.code);
                                 return (
                                     <div 
                                        key={r.code}
                                        className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedRooms(prev => prev.filter(c => c !== r.code));
                                            } else {
                                                setSelectedRooms(prev => [...prev, r.code]);
                                            }
                                        }}
                                     >
                                        <span className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </span>
                                        <span className="text-sm">{r.name}</span>
                                     </div>
                                 );
                             })}
                             
                             {/* Overlay to close when clicking outside? Or just close on click outside logic needed generally. For now, simple toggle.*/} 
                             <div className="pt-2 mt-2 border-t border-gray-100 text-right">
                                 <button 
                                    onClick={() => setIsRoomFilterOpen(false)}
                                    className="text-xs text-blue-600 hover:underline"
                                 >
                                     閉じる
                                 </button>
                             </div>
                        </div>
                    )}
                    
                    {/* Backdrop for closing */}
                    {isRoomFilterOpen && (
                        <div className="fixed inset-0 z-40" onClick={() => setIsRoomFilterOpen(false)}></div>
                    )}
                </div>

                <button 
                    onClick={handleSearch}
                    disabled={!selectedWard || isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all font-bold shadow-sm"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    検索
                </button>

                {/* Unentered Count Summary */}
                {displayedPatients.length > 0 && (() => {
                    const targetRows = displayedPatients.filter(row => {
                        const isExcluded = row.patient.excludeFromAssessment;
                        const isOvernight = row.status?.includes('外泊');
                        return !isExcluded && !isOvernight;
                    });
                    const unenteredCount = targetRows.filter(row => {
                        const data = assessments[row.admission.id];
                        // Check if ALL items are filled
                        // If data is missing OR any item is null/undefined, it's incomplete
                        if (!data || !data.items) return true;
                        
                        const isComplete = ITEM_DEFINITIONS.every(item => {
                            const val = data.items[item.id];
                            return val !== null && val !== undefined;
                        });
                        return !isComplete;
                    }).length;
                    
                    const isAllEntered = unenteredCount === 0;

                    return (
                        <div className={`ml-4 flex items-center px-4 py-2 rounded border gap-3 transition-colors ${!isAllEntered ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-green-50 border-green-200'}`}>
                            <span className={`text-sm font-bold flex items-baseline gap-1 ${!isAllEntered ? 'text-red-800' : 'text-green-800'}`}>
                                未入力: 
                                <span className={`text-xl ${!isAllEntered ? 'font-black text-red-600' : 'text-green-600'}`}>{unenteredCount}</span>
                                <span className="text-sm text-gray-500 mx-1">/</span>
                                <span className="text-sm">対象 {targetRows.length}</span>
                            </span>
                        </div>
                    );
                })()}
            </div>

            {/* Bulk Copy Button (Positioned at top right of table container or header?) 
                Actually header is flex-wrap, so it flows. 
                Let's put it at the very end of the header using ml-auto if not already. 
            */} 
            {/* Removed duplicate button as per user request */}

            {/* --- Table Container --- */}
            <div className="flex-1 overflow-auto relative">
                <table className="border-collapse w-full min-w-max">
                        <thead className="bg-gray-100 z-40 sticky top-0 font-bold text-center border-b border-gray-300 shadow-md">
                            {/* Column Group Headers */}
                            <tr>
                                <th className="sticky left-0 top-0 z-50 bg-gray-100 border border-gray-300 p-2 min-w-[250px] text-lg font-bold text-gray-700" rowSpan={2} style={{ backgroundColor: '#f3f4f6' }}>
                                    患者情報
                                </th>
                                <th colSpan={itemsGrouped.a.length} className="bg-blue-100 border border-gray-300 p-2 text-blue-900 text-lg font-bold">A項目</th>
                                <th colSpan={itemsGrouped.b.length} className="bg-yellow-100 border border-gray-300 p-2 text-yellow-900 text-lg font-bold">B項目</th>
                                <th colSpan={itemsGrouped.c.length} className="bg-green-100 border border-gray-300 p-2 text-green-900 text-lg font-bold">C項目</th>
                                <th colSpan={3} className="bg-gray-200 border border-gray-300 p-2 text-gray-900 text-lg font-bold">小計</th>
                            </tr>
                        {/* Item Headers */}
                        <tr>
                            {ITEM_DEFINITIONS.map(item => (
                                <th key={item.id} className="border border-gray-300 p-1 min-w-[50px] max-w-[50px] whitespace-pre-wrap leading-tight text-xs h-32 vertical-text bg-white" title={item.label}>
                                    <div className="break-words px-0.5">{item.label}</div>
                                </th>
                            ))}
                            <th className="border border-gray-300 p-1 min-w-[30px] bg-blue-50 text-blue-800 font-bold">A</th>
                            <th className="border border-gray-300 p-1 min-w-[30px] bg-yellow-50 text-yellow-800 font-bold">B</th>
                            <th className="border border-gray-300 p-1 min-w-[30px] bg-green-50 text-green-800 font-bold">C</th>
                        </tr>
                    </thead>
                    <tbody className="text-base">
                        {displayedPatients.map((row) => {
                            const data = assessments[row.admission.id];
                            const isDirty = dirtyMap[row.admission.id];
                            const isSevere = data?.isSevere;
                            const isExcluded = row.patient.excludeFromAssessment;
                            const isOvernight = row.status?.includes('外泊');
                            // Safety Check:
                            // 1. Future Date (Global)
                            // 2. Excluded Patient
                            // 3. Overnight Status
                            const isEditable = !(targetDate > getLocalDateString()) && !isExcluded && !isOvernight;

                            // Check completeness for Badge
                            const isComplete = data && data.items && ITEM_DEFINITIONS.every(item => {
                                const val = data.items[item.id];
                                return val !== null && val !== undefined;
                            });

                            return (
                                <tr key={row.admission.id} className={`hover:bg-gray-50 ${isDirty ? 'bg-yellow-50' : ''} ${!isEditable ? 'bg-gray-100' : ''}`}>
                                    {/* Patient Info Column */}
                                    <td className="sticky left-0 z-30 bg-white border border-gray-300 p-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style={{ backgroundColor: 'white' }}>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[10px] text-gray-500 font-mono leading-none mb-0.5">ID: {row.patient.identifier}</span>
                                                    <div className="flex items-center gap-1 group">
                                                        <span className={`font-bold truncate max-w-[150px] text-lg ${isExcluded ? 'text-gray-400' : 'text-gray-800'}`}>
                                                            {row.patient.name}
                                                        </span>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onNavigateToPatient?.(row.patient.id);
                                                            }}
                                                            className="text-gray-400 hover:text-blue-600 transition-all p-1 rounded hover:bg-blue-50"
                                                            title="患者詳細(カレンダー)へ移動"
                                                        >
                                                            <ExternalLink className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                {isExcluded && <span className="text-[10px] bg-gray-200 text-gray-500 px-1 rounded font-bold border border-gray-300">対象外</span>}
                                                {isOvernight && <span className="text-[10px] bg-orange-100 text-orange-600 px-1 rounded font-bold border border-orange-200">外泊</span>}
                                                {!isExcluded && !isOvernight && !isComplete && (
                                                    <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded font-bold border border-blue-200 whitespace-nowrap">未入力</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="font-mono bg-gray-100 px-1 rounded">{row.room || '-'}</span>
                                                <span className="truncate">{row.status}</span>
                                                {isDirty && <span className="ml-auto text-orange-600 font-bold text-[10px]">保存待ち</span>}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Evaluation Cells */}
                                    {ITEM_DEFINITIONS.map(item => {
                                        const val = data?.items?.[item.id];
                                        const assistVal = data?.items?.[`${item.id}_assist`];
                                        const isFocused = focusedCell?.admissionId === row.admission.id && focusedCell?.item.id === item.id;
                                        
                                        return (
                                            <td 
                                                key={item.id} 
                                                className={`border border-gray-300 text-center p-0 h-10 relative 
                                                    ${isFocused ? 'ring-2 ring-blue-500 z-10' : ''}
                                                    ${isDirty ? 'bg-yellow-50' : ''}
                                                `}
                                                data-cell-adm={row.admission.id}
                                                data-cell-item={item.id}
                                                onClick={() => {
                                                    if (isEditable) {
                                                        setFocusedCell({ admissionId: row.admission.id, item });
                                                    }
                                                }}
                                            >
                                                {item.inputType === 'checkbox' ? (
                                                    <div className="flex items-center justify-center h-full w-full"> 
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Prevent re-triggering cell click
                                                                setFocusedCell({ admissionId: row.admission.id, item });

                                                                if (!isEditable) return;
                                                                // Cycle: null -> 1 -> 0 -> null
                                                                let nextVal: number | null = null;
                                                                if (val === null || val === undefined) nextVal = 1;
                                                                else if (val > 0) nextVal = 0;
                                                                else nextVal = null; // 0 -> null
                                                                
                                                                handleValueChange(row.admission.id, item.id, nextVal);
                                                            }}
                                                            disabled={!isEditable}
                                                            className={`w-full h-full flex items-center justify-center transition-colors
                                                                ${!isEditable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-100'}
                                                                ${isFocused ? 'bg-yellow-100' : ''}
                                                            `}
                                                        >
                                                            {(val === 1) && <span className="text-blue-600 font-bold text-sm">実施</span>}
                                                            {(val === 0) && <span className="text-gray-400 font-bold text-xs">未実施</span>}
                                                            {(val === null || val === undefined) && <span className="text-lg leading-none text-gray-300">-</span>}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    // B-Item: Button style for popup trigger
                                                    <div 
                                                        className={`w-full h-full flex items-center justify-center font-mono text-base 
                                                            ${!isEditable ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
                                                            ${(typeof val === 'number') ? 'text-gray-900 font-bold' : 'text-gray-300'}
                                                            ${isFocused ? 'bg-yellow-100' : ''}
                                                        `}
                                                    >
                                                        {typeof val === 'number' ? val : '-'}
                                                        {item.hasAssistance && typeof assistVal === 'number' && (
                                                            <span className={`ml-1 text-[10px] px-0.5 rounded ${assistVal === 1 ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-gray-100 text-gray-400'}`}>
                                                                {assistVal === 1 ? '介' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                    {/* Score Summary Cells */}
                                    <td className="border border-gray-300 text-center font-bold bg-blue-50 text-blue-800">{data?.scores?.a ?? 0}</td>
                                    <td className="border border-gray-300 text-center font-bold bg-yellow-50 text-yellow-800">{data?.scores?.b ?? 0}</td>
                                    <td className="border border-gray-300 text-center font-bold bg-green-50 text-green-800">{data?.scores?.c ?? 0}</td>
                                </tr>
                            );
                        })}
                        {displayedPatients.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={ITEM_DEFINITIONS.length + 1} className="p-8 text-center text-gray-400">
                                    患者が見つかりません
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- Footer Action --- */}
            <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-between shrink-0 z-40">
                <div className="text-sm text-gray-500 flex items-center gap-4">
                    <span>表示: {displayedPatients.length} 名 / 未保存: <span className="font-bold text-orange-600">{Object.keys(dirtyMap).length}</span> 件</span>
                    
                    {/* Bulk Copy Button - Safe to show? Yes, logic handles checks. */}
                    <button 
                        onClick={handleCopyPreviousDay}
                        disabled={displayedPatients.length === 0 || isLoading || targetDate > getLocalDateString()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100 transition-colors text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        title={targetDate > getLocalDateString() ? "未来日のためコピーできません" : "表示中の患者について前日のデータをコピーします"}
                    >
                        <Copy className="w-3 h-3" />
                        前日コピー
                    </button>
                </div>
                <button 
                    onClick={handleSaveAll}
                    disabled={Object.keys(dirtyMap).length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600 transition-all font-bold shadow-lg"
                >
                    <Save className="w-5 h-5" />
                    一括保存
                </button>
            </div>

            {/* --- Copy Confirmation Modal --- */}
            {isCopyConfirmOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 border-l-4 border-red-500 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-3 bg-red-100 rounded-full shrink-0">
                                <AlertCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">前日データのコピー</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    表示中の<span className="font-bold text-gray-900 mx-1">{displayedPatients.length}名</span>の患者について、前日の評価データをコピーします。
                                </p>
                            </div>
                        </div>
                        
                        <div className="bg-red-50 p-4 rounded mb-6 text-sm text-red-800 space-y-2">
                            <p className="font-bold flex items-center gap-2">
                                ⚠️ 以下の点にご注意ください
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-1 opacity-90">
                                <li>現在入力中のデータは<span className="font-bold underline">すべて上書き</span>されます。</li>
                                <li>外泊中および評価対象外の患者はスキップされます。</li>
                                <li>コピー後は必ず内容を確認し、「一括保存」を行ってください。</li>
                            </ul>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setIsCopyConfirmOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-bold transition-colors"
                            >
                                キャンセル
                            </button>
                            <button 
                                onClick={executeCopyPreviousDay}
                                className="px-5 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold shadow-md transition-all flex items-center gap-2"
                            >
                                <Copy className="w-4 h-4" />
                                実行する
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Cell Edit Popup --- */}
            {focusedCell && popupPosition && (() => {
                 // Safety Check: Only show popup if row is editable
                 const row = displayedPatients.find(p => p.admission.id === focusedCell.admissionId);
                 if (!row) return null;
                 
                 const isExcluded = row.patient.excludeFromAssessment;
                 const isOvernight = row.status?.includes('外泊');
                 const isFuture = targetDate > getLocalDateString();
                 const isEditable = !isFuture && !isExcluded && !isOvernight;
                 
                 if (!isEditable) return null;

                 // UX: Don't show popup for Checkbox items (A/C items)
                 if (focusedCell.item.inputType === 'checkbox') return null;

                 return (
                    <CellEditPopup 
                        item={focusedCell.item}
                        currentValue={(assessments[focusedCell.admissionId]?.items?.[focusedCell.item.id] as number | null) ?? null}
                        currentAssistValue={(assessments[focusedCell.admissionId]?.items?.[`${focusedCell.item.id}_assist`] as number | undefined)}
                        position={popupPosition}
                        onSave={(val, assistVal) => {
                            handleValueChange(focusedCell.admissionId, focusedCell.item.id, val, assistVal);
                            // Advance focus Right (Next Item)
                            moveFocus(0, 1);
                        }}
                        onClose={() => setFocusedCell(null)}
                    />
                 );
            })()}
        </div>
    );
};
