import React, { useState, useEffect, useMemo } from 'react';
import { Patient, Admission, Ward, Room } from '../types/nursing';
import { getPatientLocationAndStatus } from '../utils/patientHelper';
import { getWards, getRooms } from '../utils/storage';
import { Search, Filter, Calendar, Building2, BedDouble, User, Check } from 'lucide-react';

interface Props {
  patients: Patient[];
  allAdmissions: Admission[];
  selectedPatientId: string | null;
  onSelectPatient: (patient: Patient) => void;
}

const STORAGE_KEY_FILTER = 'nursing_patient_list_filter_v1';

export const AdvancedPatientList: React.FC<Props> = ({ patients, allAdmissions, selectedPatientId, onSelectPatient }) => {
    // Current Date Default
    const todayStr = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }, []);

    const [targetDate, setTargetDate] = useState<string>(todayStr);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Masters
    const [wards, setWards] = useState<Ward[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);

    // Filter State
    const [selectedWards, setSelectedWards] = useState<string[]>([]);
    const [selectedRooms, setSelectedRooms] = useState<string[]>([]);

    // Computed: Admissions Grouped by Patient
    const admissionsByPatient = useMemo(() => {
        const map: Record<string, Admission[]> = {};
        allAdmissions.forEach(adm => {
            if (!map[adm.patientId]) map[adm.patientId] = [];
            map[adm.patientId].push(adm);
        });
        return map;
    }, [allAdmissions]);

    // Initialize
    useEffect(() => {
        setWards(getWards());
        setRooms(getRooms());

        const storedFilter = localStorage.getItem(STORAGE_KEY_FILTER);
        if (storedFilter) {
            try {
                const parsed = JSON.parse(storedFilter);
                if (parsed.wards) setSelectedWards(parsed.wards);
                if (parsed.rooms) setSelectedRooms(parsed.rooms);
            } catch (e) {
                console.error("Failed to load filter settings", e);
            }
        }
    }, []);

    // Save Filter
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_FILTER, JSON.stringify({
            wards: selectedWards,
            rooms: selectedRooms
        }));
    }, [selectedWards, selectedRooms]);

    // Filtering Logic
    const filteredPatients = useMemo(() => {
        return patients.filter(p => {
            // 1. Search Term
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchName = p.name.toLowerCase().includes(term);
                const matchId = p.identifier.includes(term);
                if (!matchName && !matchId) return false;
            }

            // 2. Status & Location on Target Date
            const pAdmissions = admissionsByPatient[p.id] || [];
            const { ward, room, status } = getPatientLocationAndStatus(pAdmissions, targetDate);

            // Must be currently admitted (not discharged)
            // status can be '入院', '入院中', '転棟', '転床', '外泊', '外泊中'
            // '退院' means discharged ON THAT DAY. If discharged, do we show them?
            // "デフォルトでは当日に入院している患者" -> Usually implies currently active.
            // If status is '退院', they are leaving that day. Usually still shown for the day.
            // If status is '-' (no admission), exclude.
            if (!status || status === '-') return false;
            
            // Note: getPatientLocationAndStatus returns '-' if no active admission found.
            // Wait, implementation returns { ward: null, ... } if no admission.
            // Wait, I updated patientHelper to return { ward: currentWard || '-', ... }.
            // Let's re-verify patientHelper.ts return values.
            // It returns { ward: null, room: null, status: null } if no admission.
            
            if (!status) return false;

            // 3. Ward Filter
            if (selectedWards.length > 0) {
                // ward name is stored in 'ward'. ward.code is in 'selectedWards' probably?
                // Wait, 'getWards' returns objects with 'code' and 'name'.
                // 'initialWard' in admission is NAME. (Based on dummy data generation: `const ward = INITIAL_WARDS[...].name`).
                // So I need to match NAME or CODE.
                // The logical link is likely Name in the current dummy implementation.
                // Let's check filter logic.
                
                // If the data stores Ward Name, we should filter by Ward Name.
                // But the filter UI might use Code for stability?
                // Let's assume we filter by Ward Name for now since that is what is stored in Admission.
                
                // Find the selected ward objects to get their names
                const selectedWardNames = wards.filter(w => selectedWards.includes(w.code)).map(w => w.name);
                if (!selectedWardNames.includes(ward || '')) return false;
            }

            // 4. Room Filter
            if (selectedRooms.length > 0) {
                // Similarly for rooms
                const selectedRoomNames = rooms.filter(r => selectedRooms.includes(r.code)).map(r => r.name);
                if (!selectedRoomNames.includes(room || '')) return false;
            }

            // Attach dynamic data to patient object for display? 
            // We can't mutate patient. We will use the helper again in render or return a wrapper.
            // But filter uses it.
            return true;
        }).map(p => {
            // Return enriched object for display
            const pAdmissions = admissionsByPatient[p.id] || [];
            const info = getPatientLocationAndStatus(pAdmissions, targetDate);
            return { original: p, ...info };
        });
    }, [patients, admissionsByPatient, targetDate, searchTerm, selectedWards, selectedRooms, wards, rooms]);

    // Handlers
    const toggleWard = (code: string) => {
        setSelectedWards(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
    };
    const toggleRoom = (code: string) => {
        setSelectedRooms(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
    };

    return (
        <div className="flex flex-col h-full bg-white border-r border-gray-200">
            {/* Header / Controls */}
            <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-3">
                {/* Date Picker */}
                <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-300 shadow-sm">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <input 
                        type="date" 
                        value={targetDate} 
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="flex-1 outline-none text-gray-700 font-bold"
                    />
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-300 shadow-sm">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="氏名・IDで検索" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 outline-none text-sm"
                    />
                </div>

                {/* Filter Toggle */}
                <div className="relative">
                    <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm font-bold border transition-colors ${selectedWards.length + selectedRooms.length > 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}
                    >
                        <span className="flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            絞り込み {(selectedWards.length + selectedRooms.length) > 0 && `(${selectedWards.length + selectedRooms.length})`}
                        </span>
                        {isFilterOpen ? '▲' : '▼'}
                    </button>

                    {/* Filter Dropdown Panel */}
                    {isFilterOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[400px] overflow-y-auto">
                            {/* Wards */}
                            <div className="mb-4">
                                <div className="flex items-center gap-1 text-xs font-bold text-gray-500 mb-2">
                                    <Building2 className="w-3 h-3" /> 病棟
                                </div>
                                <div className="space-y-1">
                                    {wards.map(w => (
                                        <label key={w.code} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedWards.includes(w.code)}
                                                onChange={() => toggleWard(w.code)}
                                                className="rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="truncate">{w.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Rooms */}
                            <div>
                                <div className="flex items-center gap-1 text-xs font-bold text-gray-500 mb-2">
                                    <BedDouble className="w-3 h-3" /> 病室
                                    {selectedWards.length > 0 && <span className="text-blue-600 ml-1">(選択病棟のみ)</span>}
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                    {rooms
                                        .filter(r => selectedWards.length === 0 || selectedWards.includes(r.wardCode))
                                        .map(r => (
                                        <label key={r.code} className={`flex items-center justify-center p-1.5 rounded cursor-pointer text-xs border ${selectedRooms.includes(r.code) ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedRooms.includes(r.code)}
                                                onChange={() => toggleRoom(r.code)}
                                                className="hidden"
                                            />
                                            {r.name}
                                        </label>
                                    ))}
                                    {selectedWards.length > 0 && rooms.filter(r => selectedWards.includes(r.wardCode)).length === 0 && (
                                        <div className="col-span-3 text-center text-xs text-gray-400 py-2">
                                            該当する病室はありません
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-2 pt-2 border-t flex justify-end">
                                <button onClick={() => { setSelectedWards([]); setSelectedRooms([]); }} className="text-xs text-gray-400 hover:text-red-500">クリア</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                <div className="px-3 py-2 text-xs text-gray-400 font-bold flex justify-between">
                    <span>対象患者: {filteredPatients.length}名</span>
                    <span>{targetDate}</span>
                </div>
                
                {filteredPatients.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                        該当する患者はいません
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {filteredPatients.map(p => (
                            <li 
                                key={p.original.id}
                                onClick={() => onSelectPatient(p.original)}
                                className={`p-3 cursor-pointer transition-colors hover:bg-blue-50 ${selectedPatientId === p.original.id ? 'bg-blue-100 ring-2 ring-inset ring-blue-400' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-gray-800 text-sm">{p.original.name}</span>
                                    <span className="text-xs font-mono text-gray-400">{p.original.identifier}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className={`px-1.5 py-0.5 rounded ${p.ward ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-400'}`}>
                                        {p.ward || '-'}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded font-mono ${p.room ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-400'}`}>
                                        {p.room || '-'}
                                    </span>
                                    {p.status && p.status !== '入院中' && (
                                        <span className="ml-auto px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-bold">
                                            {p.status}
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
