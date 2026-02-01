'use client';

import React, { useMemo } from 'react';
import { DailyAssessment, ITEM_DEFINITIONS } from '../types/nursing';
import { getMonthlyAssessments } from '../utils/storage';

interface MonthlyMatrixViewProps {
  patientId: string;
  currentDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  lastUpdated?: number; // データの更新を検知して再レンダリングするためのトリガー
}

export const MonthlyMatrixView: React.FC<MonthlyMatrixViewProps> = ({ 
  patientId, 
  currentDate, 
  onDateSelect,
  lastUpdated 
}) => {
  // 表示対象の年月 (currentDateから算出)
  const targetDateObj = new Date(currentDate);
  const year = targetDateObj.getFullYear();
  const month = targetDateObj.getMonth() + 1;
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

  // 月の日数取得
  const daysInMonth = new Date(year, month, 0).getDate();
  const dateList = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  });

  // データ取得 (クライアントサイドでのみ実行)
  const [monthlyData, setMonthlyData] = React.useState<Record<string, DailyAssessment>>({});

  React.useEffect(() => {
    setMonthlyData(getMonthlyAssessments(patientId, yearMonth));
  }, [patientId, yearMonth, lastUpdated]);

  // 項目カテゴライズ
  const itemsByCategory = useMemo(() => {
    const grouped = { a: [], b: [], c: [] } as Record<string, typeof ITEM_DEFINITIONS>;
    ITEM_DEFINITIONS.forEach(item => {
      if (grouped[item.category]) grouped[item.category].push(item);
    });
    return grouped;
  }, []);

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow mb-6 border border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center sticky left-0">
        <h2 className="text-lg font-bold text-gray-800">
          月間評価推移 ({year}年{month}月) <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">New</span>
        </h2>
        {/* 将来的に月切り替えボタンなどを配置可能 */}
      </div>
      
      <div className="relative overflow-x-auto" style={{ maxHeight: '600px' }}> {/* 縦スクロールも考慮 */}
        <table className="w-full text-xs text-center border-collapse">
          <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-2 border border-gray-300 min-w-[200px] text-left sticky left-0 bg-gray-100 z-20">項目 / 日付</th>
              {dateList.map(date => {
                const day = parseInt(date.split('-')[2]);
                const isSelected = date === currentDate;
                const data = monthlyData[date];
                const isSevere = data?.isSevere;
                
                return (
                  <th 
                    key={date} 
                    className={`
                      p-2 border border-gray-300 min-w-[40px] cursor-pointer transition-colors
                      ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}
                      ${isSevere ? 'bg-pink-100' : ''}
                      ${!isSelected && isSevere ? 'text-red-800' : ''}
                    `}
                    onClick={() => onDateSelect(date)}
                  >
                    {day}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* A項目 */}
            <tr className="bg-blue-50 font-bold sticky left-0 z-10">
              <td className="p-2 border border-gray-300 text-left sticky left-0 bg-blue-50">A項目 (得点)</td>
              {dateList.map(date => {
                const data = monthlyData[date];
                const isSevere = data?.isSevere;
                return (
                  <td key={date} className={`border border-gray-300 ${isSevere ? 'bg-pink-50' : ''}`}>
                    {data ? data.scores.a : '-'}
                  </td>
                );
              })}
            </tr>
            {itemsByCategory.a.map(item => (
              <tr key={item.id}>
                <td className="p-2 border border-gray-300 text-left sticky left-0 bg-white truncate max-w-[200px]" title={item.label}>
                  {item.label}
                </td>
                {dateList.map(date => {
                  const data = monthlyData[date];
                  const hasVal = data?.items[item.id] === true;
                  const isSevere = data?.isSevere;
                  return (
                    <td key={date} className={`border border-gray-300 text-gray-400 ${isSevere ? 'bg-pink-50' : ''}`}>
                      {hasVal ? <span className="text-blue-600 font-bold">●</span> : ''}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* B項目 */}
            <tr className="bg-green-50 font-bold">
              <td className="p-2 border border-gray-300 text-left sticky left-0 bg-green-50">B項目 (得点)</td>
              {dateList.map(date => {
                const data = monthlyData[date];
                const isSevere = data?.isSevere;
                return (
                  <td key={date} className={`border border-gray-300 ${isSevere ? 'bg-pink-50' : ''}`}>
                    {data ? data.scores.b : '-'}
                  </td>
                );
              })}
            </tr>
            {itemsByCategory.b.map(item => (
              <tr key={item.id}>
                <td className="p-2 border border-gray-300 text-left sticky left-0 bg-white truncate max-w-[200px]" title={item.label}>
                  {item.label}
                </td>
                {dateList.map(date => {
                  const data = monthlyData[date];
                  // B項目は number (状態スコア) だが、介助込みで0点になる場合もある
                  // ここでは「入力値（状態）」を表示するか「計算スコア」を表示するか悩ましいが
                  // マトリックスとしては入力状態(0,1,2)を表示するのが一般的
                  const val = data?.items[item.id];
                  const isSevere = data?.isSevere;

                  // 介助有無も表示したい場合は複雑になるが、一旦数字を表示
                  return (
                    <td key={date} className={`border border-gray-300 ${isSevere ? 'bg-pink-50' : ''}`}>
                      {typeof val === 'number' ? val : ''}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* C項目 (現在はダミーだが表示) */}
             <tr className="bg-gray-100 font-bold">
              <td className="p-2 border border-gray-300 text-left sticky left-0 bg-gray-100">C項目 (得点)</td>
              {dateList.map(date => {
                const data = monthlyData[date];
                const isSevere = data?.isSevere;
                return (
                  <td key={date} className={`border border-gray-300 ${isSevere ? 'bg-pink-50' : ''}`}>
                    {data ? data.scores.c : '-'}
                  </td>
                );
              })}
            </tr>

            {/* 判定結果 */}
            <tr className="bg-gray-800 text-white font-bold sticky bottom-0 z-10 shadow-lg">
              <td className="p-2 border border-gray-600 text-left sticky left-0 bg-gray-800">判定結果</td>
              {dateList.map(date => {
                const data = monthlyData[date];
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
    </div>
  );
};
