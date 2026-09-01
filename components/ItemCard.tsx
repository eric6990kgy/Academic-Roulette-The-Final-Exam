
import React from 'react';
import { ItemType } from '../types';
import { ITEM_DETAILS } from '../constants';

interface ItemCardProps {
  type: ItemType;
  count: number;
  onClick: () => void;
  disabled: boolean;
}

const ItemCard: React.FC<ItemCardProps> = ({ type, count, onClick, disabled }) => {
  const details = ITEM_DETAILS[type];
  const Icon = details.icon;

  if (count <= 0) return null;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative group flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 w-24 h-24
        ${disabled 
          ? 'bg-slate-800/50 border-slate-700 opacity-50 cursor-not-allowed' 
          : 'bg-slate-800 border-slate-600 hover:border-emerald-500 hover:bg-slate-700 active:scale-95 cursor-pointer shadow-lg'
        }
      `}
      title={details.desc}
    >
      <div className={`p-2 rounded-full bg-slate-900/50 mb-1 ${details.color}`}>
        <Icon size={20} />
      </div>
      <span className="text-xs font-bold text-slate-300 text-center leading-tight line-clamp-2">
        {details.name}
      </span>
      <div className="absolute -top-2 -right-2 bg-emerald-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border border-slate-900 shadow-md">
        {count}
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 hidden group-hover:block w-32 bg-black text-white text-xs p-2 rounded z-50 pointer-events-none shadow-xl border border-slate-700">
        {details.desc}
      </div>
    </button>
  );
};

export default ItemCard;
