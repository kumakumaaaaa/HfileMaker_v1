import React from 'react';
import { BedDouble } from 'lucide-react';

export const WardsScreen: React.FC = () => {
  return (
    <div className="p-8 h-full bg-gray-50 flex flex-col items-center justify-center text-gray-400">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <BedDouble className="w-12 h-12" />
      </div>
      <h2 className="text-xl font-bold text-gray-600">病棟・病室管理</h2>
      <p className="mt-2">この機能は現在開発中です (Phase 2)</p>
    </div>
  );
};
