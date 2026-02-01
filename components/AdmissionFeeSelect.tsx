'use client';
import React from 'react';
import { NURSING_STANDARDS } from '../types/nursing';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export const AdmissionFeeSelect: React.FC<Props> = ({ value, onChange }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded p-2"
    >
      {/* 将来的に他の入院料が増えた場合も、Constantsから生成可能 */}
      {Object.values(NURSING_STANDARDS).map((standard) => (
        <option key={standard.id} value={standard.id}>
          {standard.name}
        </option>
      ))}
    </select>
  );
};
