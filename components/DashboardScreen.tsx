import React from 'react';
import { Activity, Users, AlertTriangle, TrendingUp } from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  return (
    <div className="p-8 h-full bg-gray-50 overflow-y-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">ダッシュボード (当月統計)</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="入院患者数" value="42" subtext="前月比 +3" icon={Users} color="blue" />
        <StatCard title="重症度該当率" value="38%" subtext="目標: 35%以上" icon={Activity} color="green" />
        <StatCard title="A項目 2点以上" value="15" subtext="平均推移: 横ばい" icon={TrendingUp} color="purple" />
        <StatCard title="未評価アラート" value="2" subtext="要確認" icon={AlertTriangle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-64 flex items-center justify-center text-gray-400">
           [重症度推移グラフ エリア]
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-64 flex items-center justify-center text-gray-400">
           [病棟別訳あり患者分布 エリア]
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-3xl font-bold text-gray-800 mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <p className="text-xs text-gray-400">{subtext}</p>
    </div>
  );
};
