import React, { useEffect, useRef } from 'react';
import { LogMessage } from '../types';

interface GameLogProps {
  logs: LogMessage[];
}

const GameLog: React.FC<GameLogProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getTypeStyle = (type: LogMessage['type']) => {
    switch (type) {
      case 'damage': return 'text-rose-400 bg-rose-900/20 border-rose-800';
      case 'heal': return 'text-emerald-400 bg-emerald-900/20 border-emerald-800';
      case 'item': return 'text-sky-400 bg-sky-900/20 border-sky-800';
      case 'win': return 'text-yellow-400 font-bold bg-yellow-900/20 border-yellow-800';
      case 'loss': return 'text-gray-400 font-bold bg-gray-800 border-gray-700';
      case 'turn': return 'text-purple-300 bg-purple-900/20 border-purple-800';
      default: return 'text-slate-300 bg-slate-800/50 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border-l border-slate-700 h-full flex flex-col shadow-2xl">
      <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider p-4 border-b border-slate-700 bg-slate-900/50">
        考試紀錄
      </h3>
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2 p-4">
        {logs.length === 0 && (
          <div className="text-slate-500 text-sm italic text-center mt-10">
            考試尚未開始...
          </div>
        )}
        {logs.map((log) => (
          <div 
            key={log.id} 
            className={`text-sm p-3 rounded border-l-2 animate-fade-in ${getTypeStyle(log.type)}`}
          >
            <div className="flex justify-between items-center mb-1">
               <span className="opacity-50 text-[10px] uppercase font-mono">{log.type}</span>
               <span className="opacity-50 text-[10px] font-mono">{log.timestamp}</span>
            </div>
            <div className="leading-relaxed">
              {log.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default GameLog;