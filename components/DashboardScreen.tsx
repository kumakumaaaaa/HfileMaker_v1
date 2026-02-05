import React from 'react';
import { Activity, Users, AlertTriangle, TrendingUp, Clock, CheckCircle, Search, ArrowRight } from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  return (
    <div className="h-full bg-slate-50 overflow-y-auto">
      {/* Header Area */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <Activity className="text-blue-600" />
              経営・運用ダッシュボード
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              2026年2月5日 (木) | 最終更新: 20:45 (リアルタイム反映中)
            </p>
          </div>
          <div className="flex gap-3">
             <button className="px-4 py-2 bg-white border border-gray-300 rounded text-gray-600 font-bold hover:bg-gray-50 text-sm">
                データ出力 (CSV)
             </button>
             <button className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 text-sm shadow-sm">
                月次レポート作成
             </button>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        
        {/* Section 1: Facility Standards (Management Focus) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              1. 施設基準管理 (経営・監査)
            </h2>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
               判定: 安全圏内
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* KPI Card: Monthly Forecast */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative overflow-hidden group hover:shadow-md transition">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                 <Activity className="w-24 h-24 text-blue-600" />
              </div>
              <p className="text-sm font-bold text-gray-500 mb-1">月次着地見込 (急性期一般1)</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-blue-700">28.4%</span>
                <span className="text-sm text-gray-400">/ 目標 25.0%</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                 <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-bold">Safe</span>
                 <span className="text-gray-500">前月実績: 27.8% (+0.6pt)</span>
              </div>
              <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500 w-[75%] rounded-full"></div>
              </div>
            </div>

            {/* KPI Card: Today's Snapshot */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
              <p className="text-sm font-bold text-gray-500 mb-1">当日 該当患者数 (17:00時点)</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-800">14</span>
                <span className="text-sm text-gray-400">/ 入院 45名</span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                   <span>東病棟 (外科系)</span>
                   <span className="font-bold">35.2% (12/34)</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-500 w-[35%] rounded-full"></div>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                   <span>西病棟 (内科系)</span>
                   <span className="font-bold text-red-500">18.1% (2/11) - 注意</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                   <div className="h-full bg-red-400 w-[18%] rounded-full"></div>
                </div>
              </div>
            </div>
            
             {/* Chart: Moving Average */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition flex flex-col">
               <p className="text-sm font-bold text-gray-500 mb-3">直近7日間の推移 (全体)</p>
               <div className="flex-1 flex items-end justify-between gap-1 px-2 pb-2 border-b border-gray-100">
                  {/* Demo Bars */}
                  {[26, 28, 29, 25, 24, 28, 28].map((val, i) => (
                      <div key={i} className="flex flex-col items-center gap-1 group w-full">
                          <div className={`w-full rounded-t-sm transition-all relative group-hover:bg-opacity-80 ${val < 25 ? 'bg-red-300' : 'bg-blue-400'}`} style={{ height: `${val * 2}px` }}>
                             <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                                {val}.0%
                             </div>
                          </div>
                      </div>
                  ))}
               </div>
               <div className="flex justify-between text-[10px] text-gray-400 mt-2 px-1">
                  <span>1/30</span>
                  <span>1/31</span>
                  <span>2/1</span>
                  <span>2/2</span>
                  <span>2/3</span>
                  <span>2/4</span>
                  <span>本日</span>
               </div>
               <p className="text-xs text-red-500 mt-3 flex items-center gap-1">
                   <AlertTriangle className="w-3 h-3" /> 日曜・祝日に低下傾向あり (介入推奨)
               </p>
             </div>
          </div>
        </section>

        {/* Section 2: Operational Quality (Field Focus) */}
        <section>
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                2. 運用・品質管理 (現場向け)
             </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Omission Alert */}
             <div className="lg:col-span-1 bg-white p-0 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 bg-red-50 border-b border-red-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-bold text-red-600 mb-1">未評価アラート</p>
                            <h3 className="text-3xl font-bold text-gray-800">3 <span className="text-lg font-normal text-gray-500">名</span></h3>
                        </div>
                        <div className="bg-white p-2 rounded-full shadow-sm text-red-500">
                           <AlertTriangle className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-xs text-red-500 mt-2 font-bold">
                        締め切り (17:00) まで 残り 15分 です
                    </p>
                </div>
                <div className="p-4">
                    <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">未入力リスト</p>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-10 bg-orange-400 rounded-full"></div>
                                <div>
                                    <div className="font-bold text-gray-700">佐藤 次郎</div>
                                    <div className="text-xs text-gray-500">東病棟 101号室</div>
                                </div>
                            </div>
                            <span className="text-xs bg-white border px-2 py-1 rounded text-orange-600 font-bold">入棟初日</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-10 bg-orange-400 rounded-full"></div>
                                <div>
                                    <div className="font-bold text-gray-700">鈴木 花子</div>
                                    <div className="text-xs text-gray-500">東病棟 105号室</div>
                                </div>
                            </div>
                            <span className="text-xs bg-white border px-2 py-1 rounded text-orange-600 font-bold">術後1日目</span>
                        </div>
                    </div>
                    <button className="w-full mt-4 text-sm text-blue-600 font-bold hover:underline flex items-center justify-center gap-1">
                        すべての未評価者を見る <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
             </div>

             {/* Audit Logs / Input Time Distribution */}
             <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                 <div className="flex justify-between items-start mb-6">
                     <div>
                         <p className="text-sm font-bold text-gray-500 mb-1">評価入力時刻の分布 (直近1ヶ月)</p>
                         <h3 className="text-gray-800 font-bold">入力パターンの監査</h3>
                     </div>
                     <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">24時間分布</span>
                 </div>
                 
                 {/* CSS Bar Chart for Time Distribution */}
                 <div className="h-48 flex items-end justify-between gap-2">
                     {/* 0-6 */}
                     <div className="w-full bg-gray-50 rounded-t h-full relative group flex items-end justify-center pb-6">
                         <div className="w-4 bg-gray-300 h-[5%] rounded-t opacity-50"></div>
                         <span className="absolute bottom-0 text-[10px] text-gray-400">0-6</span>
                     </div>
                     {/* 6-9 (Morning) */}
                     <div className="w-full bg-gray-50 rounded-t h-full relative group flex items-end justify-center pb-6">
                         <div className="w-4 bg-blue-300 h-[20%] rounded-t"></div>
                         <span className="absolute bottom-0 text-[10px] text-gray-400">6-9</span>
                     </div>
                     {/* 9-12 (AM Round) */}
                     <div className="w-full bg-gray-50 rounded-t h-full relative group flex items-end justify-center pb-6">
                         <div className="w-4 bg-blue-500 h-[60%] rounded-t relative">
                            {/* Marker */}
                         </div>
                         <span className="absolute bottom-0 text-[10px] text-gray-400">9-12</span>
                     </div>
                     {/* 12-14 (Break) */}
                     <div className="w-full bg-gray-50 rounded-t h-full relative group flex items-end justify-center pb-6">
                         <div className="w-4 bg-blue-300 h-[30%] rounded-t"></div>
                         <span className="absolute bottom-0 text-[10px] text-gray-400">12-14</span>
                     </div>
                     {/* 14-17 (PM Assessment - PEAK) */}
                     <div className="w-full bg-gray-50 rounded-t h-full relative group flex items-end justify-center pb-6">
                         <div className="w-4 bg-indigo-600 h-[90%] rounded-t shadow-lg relative group">
                            <div className="absolute bottom-full mb-1 bg-black text-white text-[10px] p-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                                480件 (ピーク)
                            </div>
                         </div>
                         <span className="absolute bottom-0 text-[10px] text-gray-400 font-bold">14-17</span>
                     </div>
                     {/* 17-21 (Evening) */}
                     <div className="w-full bg-gray-50 rounded-t h-full relative group flex items-end justify-center pb-6">
                         <div className="w-4 bg-blue-400 h-[40%] rounded-t"></div>
                         <span className="absolute bottom-0 text-[10px] text-gray-400">17-21</span>
                     </div>
                     {/* 21-24 (Night - RISK) */}
                     <div className="w-full bg-red-50 rounded-t h-full relative group flex items-end justify-center pb-6 border-b-2 border-red-200">
                         <div className="w-4 bg-red-400 h-[15%] rounded-t animate-pulse"></div>
                         <span className="absolute bottom-0 text-[10px] text-red-500 font-bold">21-24</span>
                         
                         <div className="absolute top-2 right-2 flex flex-col items-end">
                            <span className="text-[10px] text-red-500 font-bold bg-white px-1 border border-red-200 rounded">
                                深夜入力の増加
                            </span>
                         </div>
                     </div>
                 </div>
                 <div className="mt-4 flex gap-4 text-xs text-gray-500">
                     <div className="flex items-center gap-1">
                         <div className="w-3 h-3 bg-indigo-600 rounded-sm"></div>
                         <span>正常入力帯 (日勤)</span>
                     </div>
                     <div className="flex items-center gap-1">
                         <div className="w-3 h-3 bg-red-400 rounded-sm"></div>
                         <span>要注意 (深夜・事後入力)</span>
                     </div>
                 </div>
             </div>
          </div>
        </section>

        {/* Section 3: Anomaly Detection List */}
        <section>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                 <h2 className="font-bold text-gray-700 flex items-center gap-2">
                     <Search className="w-4 h-4 text-gray-500" />
                     入力データの異常検知 (品質管理)
                 </h2>
                 <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">過去30日分スキャン完了</span>
             </div>
             <table className="w-full text-left text-sm">
                 <thead className="bg-gray-50 text-gray-500">
                     <tr>
                         <th className="px-6 py-3 font-medium">検知タイプ</th>
                         <th className="px-6 py-3 font-medium">対象</th>
                         <th className="px-6 py-3 font-medium">内容</th>
                         <th className="px-6 py-3 font-medium">状態</th>
                         <th className="px-6 py-3 text-right">アクション</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                     <tr className="hover:bg-gray-50">
                         <td className="px-6 py-4">
                             <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-100 text-orange-700 text-xs font-bold">
                                 <AlertTriangle className="w-3 h-3" /> 値の固定化
                             </span>
                         </td>
                         <td className="px-6 py-4 text-gray-800 font-bold">田中 次郎 (102号室)</td>
                         <td className="px-6 py-4 text-gray-600">重症度が変化しているにも関わらず、7日間「A項目0点」が連続しています。</td>
                         <td className="px-6 py-4"><span className="text-red-500 font-bold">未確認</span></td>
                         <td className="px-6 py-4 text-right">
                             <button className="text-blue-600 hover:underline">確認する</button>
                         </td>
                     </tr>
                     <tr className="hover:bg-gray-50">
                         <td className="px-6 py-4">
                             <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-700 text-xs font-bold">
                                 <Clock className="w-3 h-3" /> 後追い入力
                             </span>
                         </td>
                         <td className="px-6 py-4 text-gray-800 font-bold">スタッフB</td>
                         <td className="px-6 py-4 text-gray-600">1月28日の評価が、3日後(1月31日)にまとめて入力されています。</td>
                         <td className="px-6 py-4"><span className="text-gray-400">確認済</span></td>
                         <td className="px-6 py-4 text-right">
                             <button className="text-blue-600 hover:underline">詳細ログ</button>
                         </td>
                     </tr>
                 </tbody>
             </table>
          </div>
        </section>
      </div>
    </div>
  );
};

