import React, { useState } from 'react';
import { Calendar, Scissors, UserCheck, BookmarkCheck, Menu, X, Camera, Home } from 'lucide-react';
import { GreenlantersLogo } from './GreenlantersLogo';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  bookingCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, bookingCount }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Inicio', icon: Home },

    { id: 'livear', label: 'Pruébate nuestros diseños (en pruebas)', icon: Camera },
    { id: 'atelier', label: 'Atelier Nail Art', icon: Scissors },
    { id: 'mybookings', label: 'Mis Citas', badge: bookingCount > 0 ? bookingCount : undefined, icon: BookmarkCheck },
    { id: 'admin', label: 'Cabina Staff', icon: UserCheck }
  ];

  const handleNavClick = (tabId: string) => {
    if (tabId === 'livear') {
      window.location.href = 'https://ar.lasgreenlantersnail.es/';
      return;
    }
    if (tabId === 'atelier') {
      window.location.href = '/ateliernailart.html';
      return;
    }
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#8CFF00]/35 px-4 lg:px-12 py-3.5 flex items-center justify-between shadow-xs">
      {/* Brand Logo & SVG Component */}
      <button 
        onClick={() => handleNavClick('home')}
        className="text-left group cursor-pointer focus:outline-none flex items-center gap-3"
      >
        <GreenlantersLogo size={45} className="group-hover:scale-105 transition-transform" />
      </button>

      {/* Desktop Navigation Links */}
      <nav className="hidden lg:flex items-center gap-4 text-xs uppercase tracking-wider font-bold text-[#082D05]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`transition-all py-1.5 px-3 rounded-lg flex items-center gap-1.5 ${
                isActive 
                  ? 'bg-[#082D05] text-white shadow-[0_4px_18px_rgba(140,255,0,.12)]' 
                  : 'hover:bg-[#8CFF00]/15 text-[#082D05]/80 hover:text-[#082D05]'
              }`}
            >
              {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#8CFF00]' : 'text-[#8CFF00]'}`} />}
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="ml-1 w-4 h-4 rounded-full bg-[#8CFF00] text-[#082D05] text-[10px] flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Primary Actions & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleNavClick('booking')}
          className="px-5 py-2.5 bg-[#8CFF00] hover:bg-[#B7FF00] text-[#082D05] text-xs font-bold uppercase tracking-widest rounded-lg shadow-[0_6px_20px_rgba(140,255,0,.18)] transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <Calendar className="w-4 h-4" />
          <span>Reservar Cita</span>
        </button>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl bg-[#082D05] text-[#F7F8EF] focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-[#F7F8EF] border-b border-[#8CFF00]/30 shadow-2xl p-6 lg:hidden flex flex-col gap-3 animate-fadeIn">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full py-3 px-4 rounded-xl text-left text-xs uppercase font-bold tracking-wider flex items-center justify-between transition-all ${
                  isActive ? 'bg-[#082D05] text-[#F7F8EF]' : 'bg-white text-[#082D05] border border-neutral-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {Icon && <Icon className="w-4 h-4 text-[#8CFF00]" />}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="w-5 h-5 rounded-full bg-[#8CFF00] text-[#082D05] text-xs flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};


