import React, { useState, useEffect, useMemo } from 'react';
import { ITEM_DEFINITIONS, NursingItemDefinition, Patient, Admission, Ward, Room, DailyAssessment } from '../types/nursing';
import { getWards, getRooms, getPatients, getAdmissions, getMonthlyAssessments, saveAssessment, getPreviousDayAssessment } from '../utils/storage';
import { getPatientLocationAndStatus } from '../utils/patientHelper';
import { Calendar, Building2, BedDouble, Search, Save, Loader2, AlertCircle, Copy } from 'lucide-react';
import { evaluatePatient, calculateScores } from '../utils/evaluation';

export const WardDailyScreen: React.FC = () => {
    // --- Filter State ---
    const getLocalDateString = (d: Date = new Date()) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const [targetDate, setTargetDate] = useState(getLocalDateString());
    const [selectedWard, setSelectedWard] = useState<string>('');
    const [selectedRoom, setSelectedRoom] = useState<string>(''); // Optional

    // --- Master Data ---
    const [wards, setWards] = useState<Ward[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    
    useEffect(() => {
        setWards(getWards());
        setRooms(getRooms());
        // Default to first ward if available and not set
        const w = getWards();
        if (w.length > 0 && !selectedWard) setSelectedWard(w[0].code);
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

                if (selectedRoom) {
                    // Room matching
                    const roomMaster = rooms.find(r => r.code === selectedRoom);
                    const roomName = roomMaster?.name || '';
                    const isRoomMatch = room === roomName || room === selectedRoom;
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
        if (!confirm('表示中の全患者について、前日の評価データをコピーしますか？\n※既にデータが入力されている場合は上書きされます。\n※外泊中や評価対象外の患者はスキップされます。')) {
            return;
        }

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

    // --- Editing Logic ---
    const handleValueChange = (admissionId: string, itemId: string, value: boolean | number) => {
        setAssessments(prev => {
            const current = prev[admissionId];
            const newItems = { ...current.items, [itemId]: value };
            
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

                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-gray-300 shadow-sm">
                    <BedDouble className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-bold text-gray-700">病室:</span>
                    <select 
                        value={selectedRoom} 
                        onChange={(e) => setSelectedRoom(e.target.value)}
                        className="text-sm border-none focus:ring-0 p-0 w-24"
                    >
                        <option value="">全て</option>
                        {filteredRooms.map(r => (
                            <option key={r.code} value={r.code}>{r.name}</option>
                        ))}
                    </select>
                </div>

                <button 
                    onClick={handleSearch}
                    disabled={!selectedWard || isLoading}
                    className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors font-bold shadow-sm"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    検索
                </button>
            </div>

            {/* --- Table Container --- */}
            <div className="flex-1 overflow-auto relative">
                <table className="border-collapse w-full min-w-max">
                        <thead className="bg-gray-100 z-20 sticky top-0 font-bold text-center border-b border-gray-300 shadow-md">
                            {/* Column Group Headers */}
                            <tr>
                                <th className="sticky left-0 top-0 z-30 bg-gray-100 border border-gray-300 p-2 min-w-[250px] text-lg font-bold text-gray-700" rowSpan={2}>
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

                            return (
                                <tr key={row.admission.id} className={`hover:bg-gray-50 ${isDirty ? 'bg-yellow-50' : ''} ${!isEditable ? 'bg-gray-100' : ''}`}>
                                    {/* Patient Info Column */}
                                    <td className="sticky left-0 bg-white border border-gray-300 p-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`font-bold truncate max-w-[150px] text-lg ${isExcluded ? 'text-gray-400' : 'text-gray-800'}`}>
                                                    {row.patient.name}
                                                </span>
                                                {isSevere && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded font-bold border border-red-200">重症</span>}
                                                {isExcluded && <span className="text-[10px] bg-gray-200 text-gray-500 px-1 rounded font-bold border border-gray-300">対象外</span>}
                                                {isOvernight && <span className="text-[10px] bg-orange-100 text-orange-600 px-1 rounded font-bold border border-orange-200">外泊</span>}
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
                                        
                                        return (
                                            <td key={item.id} className="border border-gray-300 text-center p-0 h-10">
                                                {item.inputType === 'checkbox' ? (
                                                    <input 
                                                        type="checkbox"
                                                        checked={val === true}
                                                        onChange={(e) => handleValueChange(row.admission.id, item.id, e.target.checked)}
                                                        disabled={!isEditable}
                                                        className={`w-5 h-5 accent-blue-600 ${!isEditable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                                    />
                                                ) : (
                                                    <input 
                                                        type="number"
                                                        min={0}
                                                        max={2} // Simple assumption for B items
                                                        value={typeof val === 'number' ? val : 0}
                                                        onChange={(e) => handleValueChange(row.admission.id, item.id, parseInt(e.target.value) || 0)}
                                                        disabled={!isEditable}
                                                        className={`w-full h-full text-center border-none focus:ring-1 focus:ring-inset focus:ring-blue-500 font-mono text-base ${!isEditable ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                                                    />
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
                        disabled={displayedPatients.length === 0 || isLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100 transition-colors text-xs font-bold disabled:opacity-50"
                        title="表示中の患者について前日のデータをコピーします"
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
        </div>
    );
};
