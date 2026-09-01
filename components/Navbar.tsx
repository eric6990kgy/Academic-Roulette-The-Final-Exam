
import React from 'react';
import { Home, Volume2, VolumeX, GraduationCap, BookOpen } from 'lucide-react';

interface NavbarProps {
  round: number;
  subjectName?: string;
  onHomeClick: () => void;
  muted: boolean;
  onToggleMute: () => void;
  gameStarted: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ round, subjectName, onHomeClick, muted, onToggleMute, gameStarted }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-700 z-50 px-4 flex justify-between items-center shadow-lg pointer-events-auto">
      
      {/* Left: Brand / Home */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onHomeClick}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 cursor-pointer active:scale-95"
          title="返回主選單"
        >
          <Home size={20} />
          <span className="text-sm font-bold hidden sm:block">主選單</span>
        </button>
      </div>

      {/* Center: Progress & Subject */}
      {gameStarted && (
        <div className="flex flex-col items-center justify-center">
           <div className="flex items-center gap-2 text-emerald-400 font-black tracking-widest text-sm md:text-lg animate-fade-in">
             <BookOpen size={18} className="hidden md:block" />
             <span>{subjectName || `Level ${round}`}</span>
           </div>
           
           {/* Progress Dots */}
           <div className="flex items-center gap-1 mt-1 opacity-60">
             <div className={`h-1.5 rounded-full transition-all duration-500 ${round >= 1 ? 'w-6 bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'w-2 bg-slate-700'}`} />
             <div className={`h-1.5 rounded-full transition-all duration-500 ${round >= 2 ? 'w-6 bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'w-2 bg-slate-700'}`} />
             <div className={`h-1.5 rounded-full transition-all duration-500 ${round >= 3 ? 'w-6 bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'w-2 bg-slate-700'}`} />
           </div>
        </div>
      )}
      
      {!gameStarted && (
        <div className="text-slate-500 font-bold text-sm uppercase tracking-widest hidden sm:block">
          Academic Roulette
        </div>
      )}

      {/* Right: Settings */}
      <div className="flex items-center gap-2">
        <button 
          onClick={onToggleMute}
          className={`p-2 rounded-lg transition-colors cursor-pointer active:scale-95 ${muted ? 'text-slate-500 hover:text-slate-300' : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800'}`}
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
