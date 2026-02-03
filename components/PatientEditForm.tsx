import React, { useState } from 'react';
import { Save, User, Activity, Flag, Calendar, Trash2, Plus } from 'lucide-react';
import { Patient, Admission, Ward, Room } from '../types/nursing';
import { getWards, getRooms } from '../utils/storage';

interface PatientEditFormProps {
  initialPatient?: Patient;
  initialAdmissions?: Admission[];
  onSave: (patient: Patient, admissions: Admission[]) => void;
  onCancel: () => void;
}

export const PatientEditForm: React.FC<PatientEditFormProps> = ({ 
  initialPatient, 
  initialAdmissions = [], 
  onSave, 
  onCancel 
}) => {
  // Master Data
  const wards = getWards();
  const rooms = getRooms();
  const today = new Date().toISOString().split('T')[0];

  const isAvailable = (item: { startDate?: string, endDate?: string }) => {
      // If start date is future, not available
      if (item.startDate && item.startDate > today) return false;
      // If end date is past, not available
      if (item.endDate && item.endDate < today) return false;
      return true;
  };

  // Basic Info State
  const [identifier, setIdentifier] = useState(initialPatient?.identifier || '');
  const [name, setName] = useState(initialPatient?.name || '');
  const [gender, setGender] = useState<Patient['gender']>(initialPatient?.gender || '1');
  const [birthDate, setBirthDate] = useState(initialPatient?.birthDate || '');
  const [postalCode, setPostalCode] = useState(initialPatient?.postalCode || '');
  const [address, setAddress] = useState(initialPatient?.address || '');
  const [memo, setMemo] = useState(initialPatient?.memo || '');
  const [excludeFromAssessment, setExcludeFromAssessment] = useState(initialPatient?.excludeFromAssessment || false);

  // Admissions State
  const [admissions, setAdmissions] = useState<Admission[]>(initialAdmissions);

  // Address Search State
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  // Validation
  const isFormValid = identifier && name && birthDate;

  // Handlers
  const handleSave = () => {
    if (!isFormValid) return;

    const patientData: Patient = {
        id: initialPatient?.id || '',
        identifier,
        name,
        gender,
        birthDate,
        postalCode,
        address,
        memo,
        excludeFromAssessment
    };

    onSave(patientData, admissions);
  };

  const handleAddressSearch = async () => {
      if (!postalCode || postalCode.length < 7) {
          alert('7桁の郵便番号を入力してください');
          return;
      }
      setIsSearchingAddress(true);
      try {
          const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`);
          const data = await res.json();
          if (data.results) {
              const resAddress = data.results[0];
              const fullAddr = `${resAddress.address1}${resAddress.address2}${resAddress.address3}`;
              setAddress(fullAddr);
          } else {
              alert('住所が見つかりませんでした');
          }
      } catch (e) {
          console.error(e);
          alert('住所検索に失敗しました');
      } finally {
          setIsSearchingAddress(false);
      }
  };

  const addAdmission = () => {
      const newAdm: Admission = {
          id: `temp_${Date.now()}`,
          patientId: initialPatient?.id || '',
          admissionDate: new Date().toISOString().split('T')[0],
          initialWard: '一般病棟',
          initialRoom: ''
      };
      setAdmissions([...admissions, newAdm]);
  };

  const removeAdmission = (id: string) => {
      setAdmissions(admissions.filter(a => a.id !== id));
  };

  const updateAdmission = (id: string, field: keyof Admission, value: any) => {
      setAdmissions(admissions.map(a => 
          a.id === id ? { ...a, [field]: value } : a
      ));
  };

  // Movement Handlers
  const addMovement = (admissionId: string) => {
      const newMov = {
          id: `mov_${Date.now()}_${Math.random()}`,
          type: 'transfer_ward' as const,
          date: new Date().toISOString().split('T')[0]
      };
      setAdmissions(admissions.map(a => {
          if (a.id !== admissionId) return a;
          const current = a.movements || [];
          return { ...a, movements: [...current, newMov] };
      }));
  };

  const removeMovement = (admissionId: string, movementId: string) => {
      setAdmissions(admissions.map(a => {
          if (a.id !== admissionId) return a;
          return { ...a, movements: (a.movements || []).filter(m => m.id !== movementId) };
      }));
  };

  const updateMovement = (admissionId: string, movementId: string, field: string, value: any) => {
      setAdmissions(admissions.map(a => {
          if (a.id !== admissionId) return a;
          const movements = (a.movements || []).map(m => 
              m.id === movementId ? { ...m, [field]: value } : m
          );
          return { ...a, movements };
      }));
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 text-lg">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800">
            {initialPatient?.id ? '患者情報の編集' : '新規患者登録'}
        </h2>
        <div className="flex gap-4">
            <button 
                onClick={onCancel}
                className="px-6 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 font-bold"
            >
                キャンセル
            </button>
            <button 
                onClick={handleSave}
                disabled={!isFormValid}
                className={`px-6 py-2 rounded-lg text-white font-bold flex items-center gap-2
                    ${isFormValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'}
                `}
            >
                <Save className="w-5 h-5" /> 保存する
            </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                    <User className="w-6 h-6 text-gray-500" /> 基本情報
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-bold text-gray-500 uppercase mb-2">患者ID <span className="text-red-500">*</span></label>
                        <input 
                            type="text" 
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full px-4 py-3 text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                            placeholder="例: 10001"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-500 uppercase mb-2">氏名 <span className="text-red-500">*</span></label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="例: 山田 太郎"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-500 uppercase mb-2">性別</label>
                        <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
                            {[
                                { val: '1', label: '男性' },
                                { val: '2', label: '女性' },
                                { val: '3', label: 'その他' }
                            ].map(opt => (
                                <button
                                    key={opt.val}
                                    onClick={() => setGender(opt.val as any)}
                                    className={`px-6 py-2 rounded-md font-bold transition-all ${
                                        gender === opt.val 
                                        ? 'bg-white text-blue-600 shadow-sm' 
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-500 uppercase mb-2">生年月日 <span className="text-red-500">*</span></label>
                        <input 
                            type="date" 
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            className="w-full px-4 py-3 text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="md:col-span-2 border-t border-gray-100 my-2"></div>

                    {/* Exclude Flag Toggle */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-500 uppercase mb-2">評価対象区分</label>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setExcludeFromAssessment(false)}
                                className={`flex-1 py-4 px-6 rounded-lg border-2 font-bold flex items-center justify-center gap-3 transition-all
                                    ${!excludeFromAssessment 
                                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                        : 'border-gray-200 text-gray-400 hover:border-gray-300'}
                                `}
                            >
                                <Activity className="w-5 h-5" /> 評価対象
                            </button>
                            <button
                                onClick={() => setExcludeFromAssessment(true)}
                                className={`flex-1 py-4 px-6 rounded-lg border-2 font-bold flex items-center justify-center gap-3 transition-all
                                    ${excludeFromAssessment 
                                        ? 'border-red-500 bg-red-50 text-red-700' 
                                        : 'border-gray-200 text-gray-400 hover:border-gray-300'}
                                `}
                            >
                                <Flag className="w-5 h-5" /> 評価対象外
                            </button>
                        </div>
                        {excludeFromAssessment && (
                            <p className="mt-2 text-red-600 text-sm font-bold pl-1">
                                ※ この患者は看護必要度評価の対象から除外されます（集計に含まれません）。
                            </p>
                        )}
                    </div>

                    <div className="md:col-span-2 border-t border-gray-100 my-2"></div>

                    <div>
                        <label className="block text-sm font-bold text-gray-500 uppercase mb-2">郵便番号</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={postalCode}
                                onChange={(e) => setPostalCode(e.target.value)}
                                className="w-full px-4 py-3 text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                placeholder="1000001"
                                maxLength={8}
                            />
                            <button 
                                onClick={handleAddressSearch}
                                disabled={isSearchingAddress}
                                className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-700 whitespace-nowrap shadow-sm"
                            >
                                {isSearchingAddress ? '...' : '住所検索'}
                            </button>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-500 uppercase mb-2">住所</label>
                        <input 
                            type="text" 
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full px-4 py-3 text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="東京都千代田区..."
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-500 uppercase mb-2">メモ</label>
                        <input 
                            type="text"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="特記事項があれば入力してください"
                        />
                    </div>
                </div>
            </div>

            {/* Admissions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-gray-500" /> 入院歴
                    </h3>
                    <button 
                        onClick={addAdmission}
                        className="text-blue-600 font-bold hover:bg-blue-50 px-3 py-1 rounded transition-colors flex items-center gap-1"
                    >
                        <Plus className="w-5 h-5" /> 入院追加
                    </button>
                </div>

                <div className="space-y-4">
                    {admissions.length === 0 && (
                        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            入院履歴がありません
                        </div>
                    )}
                    {admissions.map((adm, index) => (
                        <div key={adm.id} className="p-6 bg-white rounded-lg border border-gray-300 shadow-sm relative group">
                            <button 
                                onClick={() => removeAdmission(adm.id)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition-colors p-2 z-10"
                                title="この入院記録を削除"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>

                            <div className="space-y-6">
                                {/* Section 1: Admission Start Info */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">入院日 <span className="text-red-500">*</span></label>
                                        <input 
                                            type="date"
                                            value={adm.admissionDate}
                                            onChange={(e) => updateAdmission(adm.id, 'admissionDate', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">入院時病棟</label>
                                        <select
                                            value={adm.initialWard || ''}
                                            onChange={(e) => updateAdmission(adm.id, 'initialWard', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        >
                                            <option value="">選択...</option>
                                            {wards.filter(w => isAvailable(w) || w.name === adm.initialWard).map(w => (
                                                <option key={w.code} value={w.name}>{w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">入院時病室</label>
                                        <select 
                                            value={adm.initialRoom || ''}
                                            onChange={(e) => updateAdmission(adm.id, 'initialRoom', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        >
                                            <option value="">選択...</option>
                                            {rooms.filter(r => isAvailable(r) || r.name === adm.initialRoom).map(r => (
                                                <option key={r.code} value={r.name}>{r.name}号室</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Section 2: Movements */}
                                <div className="border-t border-b border-gray-100 py-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                                            <Activity className="w-4 h-4 text-blue-500" /> 異動・外泊履歴
                                        </h4>
                                        <button
                                            onClick={() => addMovement(adm.id)}
                                            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded font-bold transition-colors flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" /> 追加
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {adm.movements && adm.movements.length > 0 ? (
                                            adm.movements.sort((a,b) => a.date.localeCompare(b.date)).map((mov, idx) => (
                                                <div key={mov.id} className="grid grid-cols-12 gap-2 items-end bg-gray-50/50 p-3 rounded border border-gray-200">
                                                    {/* Type */}
                                                    <div className="col-span-3">
                                                        <label className="block text-xs text-gray-500 mb-1">区分</label>
                                                        <select 
                                                            value={mov.type} 
                                                            onChange={e => updateMovement(adm.id, mov.id, 'type', e.target.value)}
                                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white"
                                                        >
                                                            <option value="transfer_ward">転棟</option>
                                                            <option value="transfer_room">転床</option>
                                                            <option value="overnight">外泊</option>
                                                        </select>
                                                    </div>

                                                    {/* Date */}
                                                    <div className="col-span-3">
                                                        <label className="block text-xs text-gray-500 mb-1">
                                                            {mov.type === 'overnight' ? '開始日' : '異動日'}
                                                        </label>
                                                        <input 
                                                            type="date" 
                                                            value={mov.date} 
                                                            onChange={e => updateMovement(adm.id, mov.id, 'date', e.target.value)}
                                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                        />
                                                    </div>

                                                    {/* Dynamic Details */}
                                                    <div className="col-span-5 grid grid-cols-2 gap-2">
                                                        {mov.type.startsWith('transfer') && (
                                                            <>
                                                                <div>
                                                                    <label className="block text-xs text-gray-500 mb-1">移動先病棟</label>
                                                                    <select 
                                                                        value={mov.ward || ''}
                                                                        onChange={e => updateMovement(adm.id, mov.id, 'ward', e.target.value)}
                                                                        disabled={mov.type === 'transfer_room'} // If room transfer only, keep ward same? No, logic says room transfer assumes same ward.
                                                                        className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white ${mov.type === 'transfer_room' ? 'bg-gray-100 text-gray-400' : ''}`}
                                                                    >
                                                                        <option value="">(変更なし)</option>
                                                                        {wards.filter(w => isAvailable(w) || w.name === mov.ward).map(w => (
                                                                            <option key={w.code} value={w.name}>{w.name}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-gray-500 mb-1">移動先病室</label>
                                                                    <select 
                                                                        value={mov.room || ''}
                                                                        onChange={e => updateMovement(adm.id, mov.id, 'room', e.target.value)}
                                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white"
                                                                    >
                                                                        <option value="">選択...</option>
                                                                        {rooms.filter(r => isAvailable(r) || r.name === mov.room).map(r => (
                                                                            <option key={r.code} value={r.name}>{r.name}号室</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </>
                                                        )}

                                                        {mov.type === 'overnight' && (
                                                            <div className="col-span-2">
                                                                <label className="block text-xs text-gray-500 mb-1">終了日 (任意)</label>
                                                                <input 
                                                                    type="date" 
                                                                    value={mov.endDate || ''} 
                                                                    onChange={e => updateMovement(adm.id, mov.id, 'endDate', e.target.value)}
                                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Remove Button */}
                                                    <div className="col-span-1 flex justify-end pb-1">
                                                        <button 
                                                            onClick={() => removeMovement(adm.id, mov.id)}
                                                            className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                                                            title="履歴を削除"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-sm text-gray-400 italic py-2 pl-2 border-l-4 border-gray-200 bg-gray-50">
                                                ・ 履歴はありません
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Section 3: Discharge */}
                                <div className="max-w-xs">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">退院日</label>
                                    <input 
                                        type="date"
                                        value={adm.dischargeDate || ''}
                                        onChange={(e) => updateAdmission(adm.id, 'dischargeDate', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="未定/入院中"
                                    />
                                    <p className="text-xs text-gray-500 mt-1 ml-1">※ 空欄の場合は入院中として扱われます</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
