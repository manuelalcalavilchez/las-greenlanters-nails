import React, { useState } from 'react';
import { BookmarkCheck, Search, Calendar, Phone, Trash2, Download, Gift, Sparkles, Printer, Check, Lock } from 'lucide-react';
import { Appointment, GiftCard } from '../types';
import { SPECIALISTS, SERVICES } from '../data/mockData';

interface MyBookingsViewProps {
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  giftCards: GiftCard[];
  setGiftCards: React.Dispatch<React.SetStateAction<GiftCard[]>>;
  setActiveTab: (tab: string) => void;
}

export const MyBookingsView: React.FC<MyBookingsViewProps> = ({
  appointments,
  setAppointments,
  giftCards,
  setGiftCards,
  setActiveTab
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'bookings' | 'giftcards'>('bookings');

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // PIN: número de teléfono de la clienta (últimos 4 dígitos del teléfono)
    // O código enviado por la empresa
    if (pinInput.length >= 4) {
      setIsAuthenticated(true);
      setPinError(false);
      sessionStorage.setItem('mybookings_pin', pinInput);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  // Si no está autenticada, mostrar formulario PIN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#082D05] flex items-center justify-center px-4 py-16">
        <form onSubmit={handlePinSubmit} className="bg-[#F7F8EF] rounded-3xl p-8 sm:p-10 max-w-sm w-full text-center space-y-6 shadow-2xl border border-[#8CFF00]/40">
          <div className="w-16 h-16 rounded-2xl bg-[#082D05] text-[#8CFF00] flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#8CFF00]">Acceso Seguro</span>
            <h1 className="font-display text-2xl font-bold text-[#082D05] mt-1">Mis Citas</h1>
            <p className="text-xs text-[#082D05]/60 mt-2">Introduce tu código de acceso para ver tus citas y tarjetas regalo.</p>
          </div>
          <div>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
              placeholder="????"
              maxLength={4}
              className={`w-full text-center tracking-[0.5em] text-lg px-4 py-3 rounded-xl border text-[#082D05] focus:outline-none focus:ring-2 focus:ring-[#8CFF00] ${pinError ? 'border-rose-400' : 'border-neutral-300'}`}
            />
          {pinError && <p className="text-xs text-rose-500 font-semibold mt-2">Código inválido. Mínimo 4 caracteres.</p>}
          </div>
          <button
            type="submit"
            className="w-full py-3.5 bg-[#082D05] hover:bg-[#176B00] text-[#F7F8EF] text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
          >
            Acceder
          </button>
          <p className="text-xs text-neutral-500 text-center">
          ℹ️ Si no tienes tu código, contacta: <strong>+34 611 223 344</strong>
          </p>
        </form>
      </div>
    );
  }

  // Gift card form state
  const [amount, setAmount] = useState<number>(50);
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [theme, setTheme] = useState<'emerald' | 'gold' | 'pearl'>('emerald');
  const [createdCard, setCreatedCard] = useState<GiftCard | null>(null);

  const cancelAppointment = (id: string) => {
    if (window.confirm('¿Estás segura de que deseas anular esta cita?')) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'Cancelada' } : a));
    }
  };

  const filteredAppointments = searchQuery.trim() === '' 
    ? appointments 
    : appointments.filter(a => 
        a.locator.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.clientPhone.includes(searchQuery) ||
        a.clientName.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleCreateGiftCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName || !senderName) {
      alert('Por favor completa el nombre de la persona destinataria y quien regala.');
      return;
    }

    const card: GiftCard = {
      id: Date.now().toString(),
      code: `GIFT-${Math.floor(1000 + Math.random() * 9000)}`,
      amount,
      recipientName,
      senderName,
      message: message || 'Disfruta de una experiencia inolvidable de alta manicura.',
      theme,
      isRedeemed: false,
      createdAt: new Date().toLocaleDateString()
    };

    setGiftCards(prev => [card, ...prev]);
    setCreatedCard(card);
  };

  const downloadICS = (appt: Appointment) => {
    const specialistObj = SPECIALISTS.find(s => s.id === appt.specialistId);
    const serviceNames = appt.serviceIds.map(id => SERVICES.find(s => s.id === id)?.name).join(', ');

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Las Greenlanters Nails//Citas//ES
BEGIN:VEVENT
SUMMARY:Cita Manicura - Las Greenlanters Nails
DESCRIPTION:Servicios: ${serviceNames}. Especialista: ${specialistObj?.name || 'Cualquiera'}. Localizador: ${appt.locator}
DTSTART:${appt.date.replace(/-/g, '')}T${appt.time.replace(':', '')}00Z
DTEND:${appt.date.replace(/-/g, '')}T${(parseInt(appt.time.split(':')[0]) + 1).toString().padStart(2, '0')}${appt.time.split(':')[1]}00Z
LOCATION:Paseo de la Elegancia 42, Madrid
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cita_${appt.locator}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F7F8EF] pb-24 lg:pb-12 px-4 lg:px-12 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#8CFF00]">Portal de Cliente</span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#082D05] mt-1">
              Mis Citas & Tarjetas Regalo
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-[#F7F8EF] p-1.5 rounded-xl">
            <button
              onClick={() => setActiveSubTab('bookings')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeSubTab === 'bookings' ? 'bg-[#082D05] text-[#F7F8EF] shadow-sm' : 'text-[#082D05]/70 hover:text-[#082D05]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Consultar Mis Citas</span>
            </button>

            <button
              onClick={() => setActiveSubTab('giftcards')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeSubTab === 'giftcards' ? 'bg-[#082D05] text-[#F7F8EF] shadow-sm' : 'text-[#082D05]/70 hover:text-[#082D05]'
              }`}
            >
              <Gift className="w-4 h-4" />
              <span>Tarjetas Regalo</span>
            </button>
          </div>
        </div>

        {/* MY BOOKINGS TAB */}
        {activeSubTab === 'bookings' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-[#8CFF00]/25 shadow-sm max-w-xl">
            <label className="block text-xs font-semibold text-[#082D05] mb-2">Buscar por Localizador (ej. LGN-4821) o Teléfono</label>
              <div className="relative">
                <Search className="absolute left-4 top-3.5 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Introduce localizador o teléfono..."
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#8CFF00] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAppointments.length === 0 ? (
                <div className="col-span-full py-16 text-center text-neutral-400 bg-white rounded-3xl border border-neutral-200">
                  No se encontraron citas con los criterios de búsqueda.
                </div>
              ) : (
                filteredAppointments.map((appt) => {
                  const staffObj = SPECIALISTS.find(s => s.id === appt.specialistId);
                  const serviceNames = appt.serviceIds.map(id => SERVICES.find(s => s.id === id)?.name).join(', ');

                  return (
                    <div key={appt.id} className="bg-white rounded-3xl border border-[#8CFF00]/30 p-6 shadow-sm flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-mono font-bold text-[#8CFF00] text-sm">{appt.locator}</span>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${
                            appt.status === 'Confirmada' ? 'bg-[#8CFF00]/20 text-[#082D05]' :
                            appt.status === 'Completada' ? 'bg-[#082D05] text-[#F7F8EF]' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {appt.status}
                          </span>
                        </div>

                        <h3 className="font-display font-bold text-base text-[#082D05] mb-1">{appt.clientName}</h3>
                        <p className="text-xs text-[#082D05]/70 mb-3">{serviceNames}</p>

                        <div className="space-y-1.5 text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-[#8CFF00]" />
                            <span>{appt.date} a las {appt.time}h</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-[#8CFF00]" />
                            <span>Especialista: {staffObj?.name || 'Cualquiera'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                        <button
                          onClick={() => downloadICS(appt)}
                          className="px-3.5 py-2 bg-[#082D05] text-[#F7F8EF] text-xs font-semibold rounded-xl hover:bg-[#176B00] flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5 text-[#8CFF00]" />
                          <span>.ICS</span>
                        </button>

                        {appt.status === 'Confirmada' && (
                          <button
                            onClick={() => cancelAppointment(appt.id)}
                            className="px-3.5 py-2 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl hover:bg-rose-100 flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Anular</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* GIFT CARDS TAB */}
        {activeSubTab === 'giftcards' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form */}
            <form onSubmit={handleCreateGiftCard} className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-3xl border border-[#8CFF00]/25 shadow-sm space-y-6">
              <h2 className="font-display text-xl font-bold text-[#082D05]">Configurar Tarjeta Regalo</h2>

              <div>
                <label className="block text-xs font-semibold text-[#082D05] mb-2">Importe del Bono</label>
                <div className="grid grid-cols-4 gap-2">
                  {[35, 50, 75, 100].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setAmount(val)}
                      className={`py-3 text-xs font-bold rounded-xl border transition-all ${
                        amount === val ? 'bg-[#082D05] text-[#F7F8EF] border-[#082D05]' : 'bg-neutral-50 text-[#082D05] border-neutral-200'
                      }`}
                    >
                      {val}€
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#082D05] mb-1">Para (Nombre Destinario/a) *</label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ej. Sofía Gómez"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#8CFF00] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#082D05] mb-1">De parte de (Tus Nombres) *</label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Ej. Carlos"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#8CFF00] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#082D05] mb-1">Mensaje Personalizado</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
              placeholder="Ej. ¡Feliz cumpleaños! Disfruta de tu manicura royal."
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#8CFF00] focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-[#8CFF00] hover:bg-[#70CC00] text-[#082D05] text-xs font-bold uppercase tracking-widest rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Gift className="w-4 h-4" />
                <span>Generar Tarjeta Regalo ({amount}€)</span>
              </button>
            </form>

            {/* Preview Card */}
            <div className="lg:col-span-6 space-y-6">
              <h2 className="font-display text-xl font-bold text-[#082D05]">Vista Previa Premium</h2>
              
              <div className="bg-gradient-to-br from-[#082D05] via-[#176B00] to-[#164E3B] text-[#F7F8EF] p-8 rounded-3xl shadow-2xl border-2 border-[#8CFF00]/60 relative overflow-hidden min-h-[340px] flex flex-col justify-between">
                <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-[#8CFF00]/10 blur-2xl pointer-events-none"></div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-display text-lg font-bold tracking-tight text-[#F7F8EF]">Las Greenlanters</span>
                    <span className="block text-[9px] uppercase tracking-widest text-[#8CFF00]">Digital Gift Card</span>
                  </div>
                  <span className="font-display text-3xl font-bold text-[#8CFF00]">{amount}€</span>
                </div>

                <div className="space-y-3 my-6">
                  <p className="text-xs text-[#F7F8EF]/70">Para: <strong className="text-[#F7F8EF]">{recipientName || '[Nombre Destinatario]'}</strong></p>
                  <p className="text-xs italic text-[#8CFF00] bg-black/20 p-3 rounded-xl border border-[#8CFF00]/30">
                    "{message || 'Disfruta de una experiencia inolvidable de alta manicura.'}"
                  </p>
                  <p className="text-xs text-[#F7F8EF]/70">De parte de: <strong className="text-[#F7F8EF]">{senderName || '[Tu Nombre]'}</strong></p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#8CFF00]/30 text-[11px] text-[#F7F8EF]/60">
                  <span className="font-mono">{createdCard ? createdCard.code : 'GIFT-XXXX'}</span>
                  <span>Canjeable en Salón y Web</span>
                </div>
              </div>

              {createdCard && (
                <div className="flex gap-4">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-3 bg-[#082D05] text-[#F7F8EF] text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-[#176B00] flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4 text-[#8CFF00]" />
                    <span>Imprimir / Guardar PDF</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

