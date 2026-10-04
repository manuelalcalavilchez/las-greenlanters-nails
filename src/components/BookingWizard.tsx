import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, ArrowRight, ArrowLeft, ShieldCheck, Download, Plus, Check } from 'lucide-react';
import { SERVICES, ADDONS, SPECIALISTS } from '../data/mockData';
import { Appointment } from '../types';

interface BookingWizardProps {
  onAddBooking: (appointment: Appointment) => void;
  setActiveTab: (tab: string) => void;
}

export const BookingWizard: React.FC<BookingWizardProps> = ({ onAddBooking, setActiveTab }) => {
  const [step, setStep] = useState<number>(1);
  const [selectedServices, setSelectedServices] = useState<string[]>(['s1']); // default first service
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [specialistId, setSpecialistId] = useState<string>('any');
  
  // Date & Time
  const today = new Date();
  const getNextDays = (count: number) => {
    const days = [];
    for (let i = 1; i <= count; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      if (d.getDay() !== 0) { // skip Sundays
        days.push(d.toISOString().split('T')[0]);
      }
    }
    return days.slice(0, 12);
  };

  const availableDates = getNextDays(12);
  const [selectedDate, setSelectedDate] = useState<string>(availableDates[0]);
  const [selectedTime, setSelectedTime] = useState<string>('10:30');

  const morningSlots = ['10:00', '11:15', '12:30', '13:45'];
  const afternoonSlots = ['15:30', '16:45', '18:00', '19:15', '20:30'];

  // Contact Info
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null);

  // Calculations
  const calcTotalDuration = () => {
    let dur = selectedServices.reduce((acc, sId) => {
      const s = SERVICES.find(x => x.id === sId);
      return acc + (s ? s.durationMinutes : 0);
    }, 0);
    dur += selectedAddons.reduce((acc, aId) => {
      const a = ADDONS.find(x => x.id === aId);
      return acc + (a ? a.durationMinutes : 0);
    }, 0);
    return dur;
  };

  const calcTotalPrice = () => {
    let price = selectedServices.reduce((acc, sId) => {
      const s = SERVICES.find(x => x.id === sId);
      return acc + (s ? s.price : 0);
    }, 0);
    price += selectedAddons.reduce((acc, aId) => {
      const a = ADDONS.find(x => x.id === aId);
      return acc + (a ? a.price : 0);
    }, 0);
    return price;
  };

  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      if (selectedServices.length > 1) {
        setSelectedServices(selectedServices.filter(s => s !== id));
      }
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  const toggleAddon = (id: string) => {
    if (selectedAddons.includes(id)) {
      setSelectedAddons(selectedAddons.filter(a => a !== id));
    } else {
      setSelectedAddons([...selectedAddons, id]);
    }
  };

  const handleFinishBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone) {
      alert('Por favor completa tu nombre y teléfono.');
      return;
    }

    const locator = `LGN-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAppt: Appointment = {
      id: Date.now().toString(),
      locator,
      serviceIds: selectedServices,
      addonIds: selectedAddons,
      specialistId,
      date: selectedDate,
      time: selectedTime,
      totalPrice: calcTotalPrice(),
      totalDuration: calcTotalDuration(),
      clientName,
      clientPhone,
      clientEmail: clientEmail || 'sin-correo@greenlanters.es',
      notes,
      status: 'Confirmada',
      createdAt: new Date().toISOString()
    };

    onAddBooking(newAppt);
    setCreatedAppointment(newAppt);
    setStep(5); // confirmation step
  };

  // Download .ics file
  const downloadICS = () => {
    if (!createdAppointment) return;
    const specialistObj = SPECIALISTS.find(s => s.id === createdAppointment.specialistId);
    const serviceNames = createdAppointment.serviceIds.map(id => SERVICES.find(s => s.id === id)?.name).join(', ');

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Las Greenlanters Nails//Citas//ES
BEGIN:VEVENT
SUMMARY:Cita Manicura - Las Greenlanters Nails
DESCRIPTION:Servicios: ${serviceNames}. Especialista: ${specialistObj?.name || 'Cualquiera'}. Localizador: ${createdAppointment.locator}
DTSTART:${createdAppointment.date.replace(/-/g, '')}T${createdAppointment.time.replace(':', '')}00Z
DTEND:${createdAppointment.date.replace(/-/g, '')}T${(parseInt(createdAppointment.time.split(':')[0]) + 1).toString().padStart(2, '0')}${createdAppointment.time.split(':')[1]}00Z
LOCATION:Paseo de la Elegancia 42, Madrid
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cita_${createdAppointment.locator}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F7F8EF] pb-24 lg:pb-12 px-4 lg:px-12 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8CFF00]">Sistema de Reservas 24/7</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#082D05] mt-2">
            Reserva Tu Experiencia en Cabina
          </h1>
          <p className="text-sm text-[#082D05]/70 mt-2">
            Elige tus tratamientos, especialista y horario preferido con confirmación inmediata.
          </p>
        </div>

        {/* Step Indicator */}
        {step < 5 && (
          <div className="grid grid-cols-4 gap-2 mb-8">
            {[
              { num: 1, label: 'Servicios' },
              { num: 2, label: 'Especialista' },
              { num: 3, label: 'Fecha & Hora' },
              { num: 4, label: 'Contacto' }
            ].map((s) => (
              <div 
                key={s.num}
                className={`flex flex-col items-center p-3 rounded-2xl border transition-all ${
                  step === s.num 
                    ? 'bg-[#082D05] text-[#F7F8EF] border-[#082D05] shadow-md' 
                    : step > s.num 
                    ? 'bg-[#176B00]/10 text-[#082D05] border-[#176B00]/30' 
                    : 'bg-white text-neutral-400 border-neutral-200'
                }`}
              >
                <span className="text-xs font-bold">{s.num}</span>
                <span className="text-[11px] font-semibold mt-1 hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* STEP 1: Services & Addons */}
        {step === 1 && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#8CFF00]/25 shadow-sm space-y-6">
            <h2 className="font-display text-xl font-bold text-[#082D05]">1. Selecciona tus Servicios Principales</h2>
            
            <div className="space-y-3">
              {SERVICES.map((s) => {
                const isSelected = selectedServices.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleService(s.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected ? 'border-[#8CFF00] bg-[#8CFF00]/5 shadow-sm ring-1 ring-[#8CFF00]' : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="space-y-1 pr-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-[#082D05]">{s.name}</h3>
                        <span className="text-[10px] uppercase font-semibold text-[#8CFF00] bg-[#8CFF00]/10 px-2 py-0.5 rounded">
                          {s.durationMinutes} min
                        </span>
                      </div>
                      <p className="text-xs text-[#082D05]/70">{s.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-display text-lg font-bold text-[#082D05]">{s.price}€</span>
                      <div className={`w-6 h-6 rounded-full mt-2 mx-auto flex items-center justify-center border transition-colors ${
                        isSelected ? 'bg-[#082D05] text-[#8CFF00] border-[#082D05]' : 'border-neutral-300'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-6 border-t border-neutral-100">
              <h3 className="font-display text-lg font-bold text-[#082D05] mb-3">Tratamientos Adicionales (Opcional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ADDONS.map((a) => {
                  const isSelected = selectedAddons.includes(a.id);
                  return (
                    <div
                      key={a.id}
                      onClick={() => toggleAddon(a.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected ? 'border-[#8CFF00] bg-[#8CFF00]/5 ring-1 ring-[#8CFF00]' : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div>
                        <span className="font-display text-xs font-bold text-[#082D05] block">{a.name}</span>
                        <span className="text-[10px] text-neutral-500">+{a.durationMinutes} min</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#082D05]">{a.price}€</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-neutral-100">
              <div>
                <span className="text-xs text-neutral-500 block">Total Estimado</span>
                <span className="font-display text-2xl font-bold text-[#082D05]">{calcTotalPrice()}€</span>
                <span className="text-xs text-[#8CFF00] font-semibold ml-2">({calcTotalDuration()} mins)</span>
              </div>
              <button
                onClick={() => setStep(2)}
                className="px-8 py-4 bg-[#082D05] hover:bg-[#176B00] text-[#F7F8EF] text-xs font-bold uppercase tracking-widest rounded-2xl shadow-lg transition-all flex items-center gap-2"
              >
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Specialists */}
        {step === 2 && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#8CFF00]/25 shadow-sm space-y-6">
            <h2 className="font-display text-xl font-bold text-[#082D05]">2. Elige a tu Especialista</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SPECIALISTS.map((staff) => {
                const isSelected = specialistId === staff.id;
                return (
                  <div
                    key={staff.id}
                    onClick={() => setSpecialistId(staff.id)}
                    className={`p-6 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                      isSelected ? 'border-[#8CFF00] bg-[#8CFF00]/5 ring-2 ring-[#8CFF00]' : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full bg-[#082D05] text-[#8CFF00] flex items-center justify-center text-2xl shrink-0">
                      {staff.avatar}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-[#082D05]">{staff.name}</h3>
                      <p className="text-xs text-[#8CFF00] font-medium">{staff.role}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-neutral-100">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-neutral-300 text-[#082D05] text-xs font-semibold rounded-2xl hover:bg-neutral-50 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-8 py-4 bg-[#082D05] hover:bg-[#176B00] text-[#F7F8EF] text-xs font-bold uppercase tracking-widest rounded-2xl shadow-lg transition-all flex items-center gap-2"
              >
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Date & Time */}
        {step === 3 && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#8CFF00]/25 shadow-sm space-y-6">
            <h2 className="font-display text-xl font-bold text-[#082D05]">3. Selecciona Fecha y Horario</h2>
            
            <div>
              <label className="block text-xs font-semibold text-[#082D05] mb-3">Días Disponibles</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {availableDates.map((dateStr) => {
                  const isSelected = selectedDate === dateStr;
                  const dObj = new Date(dateStr);
                  const dayName = dObj.toLocaleDateString('es-ES', { weekday: 'short' });
                  const dayNum = dObj.getDate();
                  const monthName = dObj.toLocaleDateString('es-ES', { month: 'short' });

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isSelected 
                          ? 'bg-[#082D05] text-[#F7F8EF] border-[#082D05] shadow-md' 
                          : 'bg-neutral-50 text-[#082D05] border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <span className="block text-[10px] uppercase font-semibold opacity-75">{dayName}</span>
                      <span className="block font-display text-lg font-bold">{dayNum}</span>
                      <span className="block text-[10px] opacity-75">{monthName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div>
                <span className="text-xs font-semibold text-[#082D05] block mb-2">Turno de Mañana</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {morningSlots.map((timeStr) => (
                    <button
                      key={timeStr}
                      onClick={() => setSelectedTime(timeStr)}
                      className={`py-3 text-xs font-semibold rounded-xl border transition-all ${
                        selectedTime === timeStr ? 'bg-[#8CFF00] text-[#082D05] border-[#8CFF00] font-bold' : 'bg-white text-[#082D05] border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      {timeStr}h
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-[#082D05] block mb-2">Turno de Tarde</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {afternoonSlots.map((timeStr) => (
                    <button
                      key={timeStr}
                      onClick={() => setSelectedTime(timeStr)}
                      className={`py-3 text-xs font-semibold rounded-xl border transition-all ${
                        selectedTime === timeStr ? 'bg-[#8CFF00] text-[#082D05] border-[#8CFF00] font-bold' : 'bg-white text-[#082D05] border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      {timeStr}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-neutral-100">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 border border-neutral-300 text-[#082D05] text-xs font-semibold rounded-2xl hover:bg-neutral-50 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-8 py-4 bg-[#082D05] hover:bg-[#176B00] text-[#F7F8EF] text-xs font-bold uppercase tracking-widest rounded-2xl shadow-lg transition-all flex items-center gap-2"
              >
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Contact & Policy */}
        {step === 4 && (
          <form onSubmit={handleFinishBooking} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#8CFF00]/25 shadow-sm space-y-6">
            <h2 className="font-display text-xl font-bold text-[#082D05]">4. Tus Datos & Confirmación</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#082D05] mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej. Carmen de la Vega"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#8CFF00] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#082D05] mb-1">WhatsApp de Contacto *</label>
                <input
                  type="tel"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#8CFF00] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#082D05] mb-1">Correo Electrónico (para confirmación)</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="carmen@ejemplo.es"
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#8CFF00] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#082D05] mb-1">Notas o Alergias Especiales</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Sensibilidad en cutículas, prefiero limado ovalado..."
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#8CFF00] focus:outline-none resize-none"
              />
            </div>

            <div className="p-4 bg-[#F7F8EF] rounded-2xl border border-[#8CFF00]/30 text-xs text-[#082D05]/80 space-y-1">
              <strong className="text-[#082D05] block font-semibold">Política de Cancelación 24h</strong>
            <p>Puedes cancelar o modificar tu cita sin coste hasta 24 horas antes a través de nuestro portal "Mis Citas" o WhatsApp.</p>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-3 border border-neutral-300 text-[#082D05] text-xs font-semibold rounded-2xl hover:bg-neutral-50 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
              <button
                type="submit"
                className="px-8 py-4 bg-[#082D05] hover:bg-[#176B00] text-[#F7F8EF] text-xs font-bold uppercase tracking-widest rounded-2xl shadow-lg transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#8CFF00]" />
                <span>Confirmar Reserva ({calcTotalPrice()}€)</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 5: Success Confirmation */}
        {step === 5 && createdAppointment && (
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-[#8CFF00]/30 text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-[#082D05] text-[#8CFF00] rounded-full flex items-center justify-center mx-auto text-3xl shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="font-display text-3xl font-bold text-[#082D05]">¡Cita Confirmada con Éxito!</h2>
            <p className="text-sm text-[#082D05]/70">
              Te esperamos en Las Greenlanters Nails. Hemos registrado tu reserva correctamente.
            </p>

            <div className="p-6 bg-[#F7F8EF] rounded-2xl border border-[#8CFF00]/40 max-w-md mx-auto space-y-3 text-left">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
                <span className="text-xs text-neutral-500">Localizador</span>
                <span className="font-mono font-bold text-[#082D05] text-base">{createdAppointment.locator}</span>
              </div>
              <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
                <span className="text-xs text-neutral-500">Fecha y Hora</span>
                <span className="font-semibold text-[#082D05] text-xs">{createdAppointment.date} a las {createdAppointment.time}h</span>
              </div>
              <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
                <span className="text-xs text-neutral-500">Especialista</span>
                <span className="font-semibold text-[#082D05] text-xs">
                  {SPECIALISTS.find(s => s.id === createdAppointment.specialistId)?.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-500">Total a Pagar en Cabina</span>
                <span className="font-display font-bold text-[#8CFF00] text-base">{createdAppointment.totalPrice}€</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={downloadICS}
                className="w-full sm:w-auto px-6 py-3.5 bg-[#082D05] text-[#F7F8EF] text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-[#176B00] flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-[#8CFF00]" />
                <span>Descargar Archivo .ICS</span>
              </button>

              <a
                href={`https://wa.me/34614118598?text=Hola,%20tengo%20la%20cita%20con%20localizador%20${createdAppointment.locator}%20para%20el%20dia%20${createdAppointment.date}%20a%20las%20${createdAppointment.time}h.%20Confirmada!`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-6 py-3.5 bg-[#8CFF00] text-[#082D05] text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-[#70CC00] flex items-center justify-center gap-2"
              >
                <span>Confirmar por WhatsApp</span>
              </a>
            </div>

            <div className="pt-4">
              <button
                onClick={() => setActiveTab('mybookings')}
                className="text-xs font-semibold text-[#8CFF00] hover:underline"
              >
                Ver mis citas guardadas → 
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

