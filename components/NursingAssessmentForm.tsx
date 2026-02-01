'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { AdmissionFeeSelect } from './AdmissionFeeSelect';
import { NURSING_STANDARDS, NursingAssessment, ITEM_DEFINITIONS, NursingItemDefinition } from '../types/nursing';
import { evaluatePatient } from '../utils/evaluation';

// 判定フォームコンポーネント
export const NursingAssessmentForm: React.FC<{
  patientName?: string;
  currentDate: string;
  onDateChange: (date: string) => void;
  initialData?: any; // 保存されたデータ (DailyAssessment['items'])
  onSave: (items: Record<string, boolean | number>, scores: { a: number, b: number, c: number }, isSevere: boolean) => void;
  onCopyPrevious: () => void;
}> = ({ patientName, currentDate, onDateChange, initialData, onSave, onCopyPrevious }) => {
  const [admissionFeeId, setAdmissionFeeId] = useState<string>(NURSING_STANDARDS.ACUTE_GENERAL_5.id);
  const [inputItems, setInputItems] = useState<Record<string, boolean | number>>({});

  // 初期データ反映 (患者変更・日付変更時)
  useEffect(() => {
    if (initialData) {
      setInputItems(initialData);
    } else {
      // 新規の場合はリセット
      setInputItems({});
    }
  }, [initialData]);

  // itemsからスコア計算を行うためにevaluatePatientと同じロジックをここで簡易的に使うか、
  // あるいはevaluatePatientがスコアも返すように修正するのがベストだが、
  // ここでは表示用に再計算する (evaluatePatient内部と同じロジック)
  const { isSevere, scores } = useMemo(() => {
    let a = 0, b = 0, c = 0;
    ITEM_DEFINITIONS.forEach(def => {
      const val = inputItems[def.id];
      if (def.category === 'a' && val === true) a += def.points;
      if (def.category === 'c' && val === true) c += def.points;
      if (def.category === 'b' && typeof val === 'number') {
        let points = val;
        if (def.hasAssistance) {
           const assistVal = inputItems[`${def.id}_assist`];
           const mult = (typeof assistVal === 'number') ? assistVal : 0;
           points = points * mult;
        }
        b += points;
      }
    });

    // 判定ロジック呼び出し
    // 明示的に計算したスコアを渡すことで、util側での再計算と整合性を取る
    const isSevereResult = evaluatePatient(admissionFeeId, { 
      items: inputItems,
      scoreA: a, scoreB: b, scoreC: c
    });

    return { isSevere: isSevereResult, scores: { a, b, c } };
  }, [admissionFeeId, inputItems]);

  // 現在選択されている入院料の情報
  const currentStandard = Object.values(NURSING_STANDARDS).find(s => s.id === admissionFeeId);

  const handleItemChange = (itemId: string, value: boolean | number) => {
    setInputItems(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSave = () => {
    onSave(inputItems, scores, isSevere);
    alert('保存しました');
  };

  // カテゴリごとに定義をグルーピング
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, NursingItemDefinition[]> = { a: [], b: [], c: [] };
    ITEM_DEFINITIONS.forEach(item => {
      if (grouped[item.category]) grouped[item.category].push(item);
    });
    return grouped;
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* ヘッダーツールバー */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <h2 className="text-xl font-bold text-gray-800">
            {patientName ? `${patientName} 様` : '未選択'}
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">評価日:</label>
            <input 
              type="date" 
              value={currentDate} 
              onChange={(e) => onDateChange(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onCopyPrevious}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            📋 前日コピー
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-bold shadow-sm"
          >
            💾 保存
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* 左側: 入力フォーム */}
        <div className="flex-1 bg-white p-6 rounded-lg shadow-md overflow-y-auto max-h-[calc(100vh-200px)]">
          <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">評価入力</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">入院料区分</label>
            <AdmissionFeeSelect value={admissionFeeId} onChange={setAdmissionFeeId} />
          </div>

          <div className="space-y-8">
            {/* A項目 */}
            <section>
              <h3 className="text-lg font-semibold text-blue-800 border-b pb-2 mb-4">A項目 (モニタリング・処置等)</h3>
              <div className="grid grid-cols-1 gap-3">
                {itemsByCategory.a.map(item => (
                  <CheckboxItem 
                    key={item.id} 
                    item={item} 
                    checked={inputItems[item.id] === true}
                    onChange={(checked) => handleItemChange(item.id, checked)}
                  />
                ))}
              </div>
            </section>

            {/* B項目 */}
            <section>
              <h3 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">B項目 (患者の状況等)</h3>
              <div className="space-y-4">
                {itemsByCategory.b.map(item => (
                  <SelectItem 
                    key={item.id} 
                    item={item} 
                    value={(inputItems[item.id] as number) ?? 0}
                    assistValue={item.hasAssistance ? (inputItems[`${item.id}_assist`] as number) : undefined}
                    onChange={(val) => handleItemChange(item.id, val)}
                    onAssistChange={(val) => handleItemChange(`${item.id}_assist`, val)}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* 右側: 判定結果 */}
        <div className="w-full md:w-96 bg-white p-6 rounded-lg shadow-md h-fit sticky top-6">
          <h2 className="text-xl font-bold mb-6 text-gray-800">リアルタイム判定結果</h2>
          
          <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-100">
            <h3 className="font-semibold text-blue-800 mb-2">現在の判定基準</h3>
            <p className="text-sm text-blue-700 font-medium">
              {currentStandard?.name}
            </p>
            <div className="mt-2 text-xs text-blue-600 space-y-1">
               <p>• パターン1: A項目2点以上 かつ B項目3点以上</p>
               {/* C項目判定は現在非表示 */}
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600">A項目 合計</span>
              <span className="text-2xl font-bold text-blue-600">{scores.a} 点</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600">B項目 合計</span>
              <span className="text-2xl font-bold text-green-600">{scores.b} 点</span>
            </div>
          </div>

          <div className={`p-6 rounded-lg text-center border-4 transition-all duration-300 transform ${isSevere ? 'bg-red-50 border-red-500 scale-105 shadow-xl' : 'bg-gray-100 border-gray-300'}`}>
            <p className={`text-sm mb-1 uppercase tracking-wide font-bold ${isSevere ? 'text-red-600' : 'text-gray-500'}`}>判定結果</p>
            <p className={`text-3xl font-extrabold ${isSevere ? 'text-red-700' : 'text-gray-400'}`}>
              {isSevere ? '「重症」該当' : '非該当'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// チェックボックス項目用コンポーネント
const CheckboxItem: React.FC<{
  item: NursingItemDefinition;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ item, checked, onChange }) => (
  <div className={`
    flex items-start p-3 border rounded-md transition-colors
    ${checked ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50 border-gray-200'}
  `}>
    <div className="flex items-center h-5">
      <input
        id={`checkbox-${item.id}`}
        type="checkbox"
        className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
    <label htmlFor={`checkbox-${item.id}`} className="ml-3 block cursor-pointer w-full">
      <span className="block text-sm font-medium text-gray-900">
        {item.label} <span className="text-xs text-gray-500 ml-1">({item.points}点)</span>
      </span>
      {item.description && <span className="block text-xs text-gray-500">{item.description}</span>}
    </label>
  </div>
);

// 選択式項目用コンポーネント (B項目等)
const SelectItem: React.FC<{
  item: NursingItemDefinition;
  value: number; // 状態スコア (0, 1, 2)
  assistValue?: number; // 介助実施 (0, 1) or undefined
  onChange: (val: number) => void;
  onAssistChange?: (val: number) => void;
}> = ({ item, value, assistValue, onChange, onAssistChange }) => {
  // 現在の計算点数表示
  let displayPoints = value;
  if (item.hasAssistance) {
    displayPoints = value * (assistValue ?? 0);
  }

  return (
    <div className="p-4 border border-gray-200 rounded-md bg-white shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-bold text-gray-900">{item.label}</span>
        <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-700 font-bold">
          現在の点数: {displayPoints}点
        </span>
      </div>
      
      <div className="space-y-3">
        {/* 状態選択 */}
        <div>
          <span className="text-xs text-gray-500 block mb-1">患者の状態</span>
          <div className="flex flex-wrap gap-2">
            {item.options?.map((opt) => (
              <button
                key={opt.label}
                onClick={() => onChange(opt.value)}
                className={`
                  px-3 py-1.5 text-xs rounded border transition-colors
                  ${value === opt.value
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 介助実施 (該当項目のみ) */}
        {item.hasAssistance && (
          <div className="pt-2 border-t border-gray-100 mt-2">
             <span className="text-xs text-gray-500 block mb-1">介助の実施</span>
             <div className="flex gap-2">
               <button
                 onClick={() => onAssistChange?.(1)}
                 className={`
                   px-3 py-1.5 text-xs rounded border transition-colors flex items-center
                   ${assistValue === 1
                     ? 'bg-blue-600 text-white border-blue-600'
                     : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}
                 `}
               >
                 あり (実施)
               </button>
               <button
                 onClick={() => onAssistChange?.(0)}
                 className={`
                   px-3 py-1.5 text-xs rounded border transition-colors flex items-center
                   ${assistValue === 0
                     ? 'bg-gray-500 text-white border-gray-500'
                     : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}
                 `}
               >
                 なし (未実施)
               </button>
             </div>
             {assistValue !== 1 && (
               <p className="text-xs text-red-500 mt-1">※介助未実施のため 0点 となります</p>
             )}
          </div>
        )}
      </div>
    </div>
  );
};
