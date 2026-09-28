import React from 'react';
import { Home, Plus, Palette, BookmarkCheck } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F7F8EF]/95 backdrop-blur-lg border-t border-[#8CFF00]/20 px-3 py-2 flex items-center justify-around shadow-2xl">
      <button
        onClick={() => setActiveTab('home')}
        className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${activeTab === 'home' ? 'text-[#8CFF00]' : 'text-[#082D05]/60 hover:text-[#082D05]'}`}
      >
        <Home className="w-5 h-5" />
        <span>Inicio</span>
      </button>


      {/* Elevated center button */}
      <button
        onClick={() => setActiveTab('booking')}
        className="relative -top-4 w-14 h-14 bg-[#082D05] hover:bg-[#176B00] text-[#F7F8EF] rounded-full shadow-xl flex items-center justify-center border-4 border-[#F7F8EF] transition-transform active:scale-95"
        title="Reservar Cita"
      >
        <Plus className="w-7 h-7 text-[#8CFF00]" />
      </button>

      <button
        onClick={() => setActiveTab('atelier')}
        className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${activeTab === 'atelier' ? 'text-[#8CFF00]' : 'text-[#082D05]/60 hover:text-[#082D05]'}`}
      >
        <Palette className="w-5 h-5" />
        <span>Diseña</span>
      </button>

      <button
        onClick={() => setActiveTab('mybookings')}
        className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${activeTab === 'mybookings' ? 'text-[#8CFF00]' : 'text-[#082D05]/60 hover:text-[#082D05]'}`}
      >
        <BookmarkCheck className="w-5 h-5" />
        <span>Mis Citas</span>
      </button>
    </div>
  );
};

