'use client';

import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { NursingItemDefinition } from '../types/nursing';

interface CellEditPopupProps {
  item: NursingItemDefinition;
  currentValue: boolean | number;
  currentAssistValue?: number; // 0 or 1
  onSave: (val: boolean | number, assistVal?: number) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

export const CellEditPopup: React.FC<CellEditPopupProps> = ({ item, currentValue, currentAssistValue, onSave, onClose, position }) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [localVal, setLocalVal] = React.useState(currentValue);
  const [localAssist, setLocalAssist] = React.useState(currentAssistValue ?? 1); // Default to yes

  // Focus trap / Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close immediately on click outside, let user confirm with button?
      // Or just standard click-outside-close-without-saving?
      // Requirement says "click to confirm" for main value, but with two inputs (status + assist), 
      // we might need a "Confirm" button or auto-save on value select?
      // User said "Confirm while checking explanation". 
      // Let's keep "Click option to save" but if assistance is present, maybe we need to enable assistance toggling FIRST?
      // Or, add a row for Assistance at the top.
      
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const [adjustedStyle, setAdjustedStyle] = React.useState<React.CSSProperties>({
    top: position.y,
    left: position.x,
    opacity: 0, // Hidden initially for measurement
    zIndex: 1000,
  });

  useLayoutEffect(() => {
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      let top = position.y;
      let left = position.x;

      // Adjust Vertical
      if (rect.bottom > viewportHeight) {
          // Flip upwards: Position - Height
          top = position.y - rect.height;
          // Ensure it doesn't go off top
          if (top < 0) top = 10; 
      }
      
      // Adjust Horizontal (if needed in future, currently just check right edge)
      if (rect.right > window.innerWidth) {
          left = window.innerWidth - rect.width - 10;
      }

      setAdjustedStyle({
        top,
        left,
        opacity: 1,
        zIndex: 1000,
      });
    }
  }, [position]);

  const handleSelectOption = (val: number) => {
      // If item has assistance, we save both values. 
      // If we rely on current state for assistance:
      onSave(val, item.hasAssistance ? localAssist : undefined);
      onClose();
  };

  return (
    <div 
      ref={popupRef}
      className="fixed bg-white border border-gray-300 shadow-xl rounded-lg p-4 w-80 text-sm animate-in fade-in zoom-in-95 duration-100"
      style={adjustedStyle}
    >
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
        <h3 className="font-bold text-gray-800">{item.label}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div className="space-y-3">
        {/* Assistance Toggle */}
        {item.hasAssistance && (
            <div className="bg-orange-50 p-2 rounded border border-orange-200 mb-2">
                <span className="text-xs font-bold text-orange-800 block mb-1">介助の実施</span>
                <div className="flex gap-2">
                    <button 
                       onClick={() => setLocalAssist(1)}
                       className={`flex-1 py-1 px-2 rounded text-xs border ${localAssist === 1 ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-300'}`}
                    >
                        あり (実施)
                    </button>
                    <button 
                       onClick={() => setLocalAssist(0)}
                       className={`flex-1 py-1 px-2 rounded text-xs border ${localAssist === 0 ? 'bg-gray-600 text-white border-gray-700' : 'bg-white text-gray-600 border-gray-300'}`}
                    >
                        なし (未実施)
                    </button>
                </div>
                <p className="text-[10px] text-orange-600 mt-1">※「なし」を選択すると、項目の点数は0点になります。</p>
            </div>
        )}

        {item.inputType === 'checkbox' ? (
          <div className="flex flex-col gap-2">
            <button
               onClick={() => { onSave(true); onClose(); }}
               className={`p-3 text-left rounded border transition-colors ${currentValue === true ? 'bg-blue-50 border-blue-500 text-blue-800 font-bold' : 'hover:bg-gray-50 border-gray-200'}`}
            >
              あり / 実施 (1点)
            </button>
            <button
               onClick={() => { onSave(false); onClose(); }}
               className={`p-3 text-left rounded border transition-colors ${currentValue === false ? 'bg-gray-100 border-gray-400 font-bold' : 'hover:bg-gray-50 border-gray-200'}`}
            >
              なし / 未実施 (0点)
            </button>
             {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {item.options?.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelectOption(opt.value)}
                className={`p-3 text-left rounded border transition-colors group ${currentValue === opt.value ? 'bg-green-50 border-green-500 ring-1 ring-green-500' : 'hover:bg-gray-50 border-gray-200'}`}
              >
                <div className="flex justify-between items-center">
                  <span className={`font-bold ${currentValue === opt.value ? 'text-green-800' : 'text-gray-700'}`}>
                    {opt.label}
                  </span>
                </div>
                {opt.explanation && (
                  <p className="text-xs text-gray-500 mt-1 group-hover:text-gray-700">{opt.explanation}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-gray-100 text-right">
        <span className="text-xs text-gray-400">値を選択すると確定して閉じます</span>
      </div>
    </div>
  );
};
