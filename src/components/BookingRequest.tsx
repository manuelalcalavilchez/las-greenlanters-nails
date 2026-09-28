import React, { useState } from 'react';
import { Send, CheckCircle2, Calendar, Phone, Mail } from 'lucide-react';

interface BookingRequestProps {
  setActiveTab: (tab: string) => void;
}

export const BookingRequest: React.FC<BookingRequestProps> = ({ setActiveTab }) => {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    serviceType: 'gel',
    preferredDate: '',
    preferredTime: '',
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientName || !formData.clientPhone || !formData.clientEmail) {
      alert('Por favor completa todos los campos requeridos.');
      return;
    }

    setLoading(true);

    try {
      // Enviar al servidor
      const response = await fetch('/api/booking-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          createdAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        setStep('success');
        // Reset form después de 3 segundos
        setTimeout(() => {
          setFormData({
            clientName: '',
            clientPhone: '',
            clientEmail: '',
            serviceType: 'gel',
            preferredDate: '',
            preferredTime: '',
            notes: ''
          });
        }, 3000);
      } else {
        alert('Error al enviar la solicitud. Intenta de nuevo.');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error de conexión. Por favor intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#F7F8EF] pb-24 lg:pb-12 px-4 lg:px-12 py-8 flex items-center justify-center">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-[#082D05] text-[#8CFF00] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          
          <div>
            <h1 className="font-display text-3xl font-bold text-[#082D05] mb-2">
              ¡Solicitud Enviada!
            </h1>
            <p className="text-neutral-600 mb-4">
              Hemos recibido tu solicitud de cita. Nos pondremos en contacto pronto para confirmar.
            </p>
            <p className="text-sm text-neutral-500">
              Revisa tu correo electrónico para actualizaciones.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#8CFF00]/30 p-6 space-y-4 text-left">
            <div className="flex gap-3 items-start">
              <Phone className="w-5 h-5 text-[#8CFF00] shrink-0 mt-1" />
              <div className="text-sm">
                <p className="font-semibold text-[#082D05]">Teléfono</p>
                <p className="text-neutral-600">Información de contacto pendiente de confirmar</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <Mail className="w-5 h-5 text-[#8CFF00] shrink-0 mt-1" />
              <div className="text-sm">
                <p className="font-semibold text-[#082D05]">Email</p>
                <p className="text-neutral-600">Información de contacto pendiente de confirmar</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep('form')}
            className="px-6 py-3 bg-[#082D05] text-[#F7F8EF] text-xs font-bold uppercase rounded-xl hover:bg-[#176B00] transition-all"
          >
            Nueva Solicitud
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8EF] pb-24 lg:pb-12 px-4 lg:px-12 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8CFF00]">Solicita tu cita</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#082D05] mt-1">
            Reserva tu Experiencia
          </h1>
          <p className="text-neutral-600 mt-2">
            Cuéntanos qué deseas y nos pondremos en contacto para confirmar tu cita.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#8CFF00]/25 p-8 space-y-6">
          {/* Datos Personales */}
          <div className="space-y-4">
            <h2 className="font-semibold text-[#082D05] text-sm uppercase">Tus Datos</h2>
            
            <div>
              <label className="block text-xs font-bold text-[#082D05] mb-2">Nombre *</label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                placeholder="Tu nombre completo"
                required
                className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CFF00]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#082D05] mb-2">Teléfono *</label>
                <input
                  type="tel"
                  name="clientPhone"
                  value={formData.clientPhone}
                  onChange={handleChange}
                  placeholder="Información de contacto pendiente de confirmar"
                  required
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CFF00]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#082D05] mb-2">Email *</label>
                <input
                  type="email"
                  name="clientEmail"
                  value={formData.clientEmail}
                  onChange={handleChange}
                  placeholder="tu@correo.com"
                  required
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CFF00]"
                />
              </div>
            </div>
          </div>

          {/* Preferencias de Cita */}
          <div className="space-y-4 pt-6 border-t border-neutral-200">
            <h2 className="font-semibold text-[#082D05] text-sm uppercase">Tu Cita</h2>
            
            <div>
              <label className="block text-xs font-bold text-[#082D05] mb-2">Tipo de Servicio</label>
              <select name="serviceType" value={formData.serviceType} onChange={handleChange} className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CFF00]">
                <option value="gel">Uñas en gel</option>
                <option value="poligel">Uñas en poligel</option>
                <option value="dibujos-a-mano">Dibujos a mano</option>
                <option value="decoracion">Decoración personalizada</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#082D05] mb-2">Fecha Preferida</label>
                <input
                  type="date"
                  name="preferredDate"
                  value={formData.preferredDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CFF00]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#082D05] mb-2">Hora Preferida</label>
                <input
                  type="time"
                  name="preferredTime"
                  value={formData.preferredTime}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CFF00]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#082D05] mb-2">Notas Especiales</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Cuéntanos si tienes alguna preferencia o necesidad especial..."
                className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CFF00] min-h-24"
              />
            </div>
          </div>

          {/* Botón Enviar */}
          <div className="pt-6 border-t border-neutral-200">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#082D05] hover:bg-[#176B00] disabled:opacity-50 text-[#F7F8EF] text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Enviando...' : 'Enviar Solicitud'}</span>
            </button>
          </div>

          <p className="text-xs text-neutral-500 text-center">
            Tu información está protegida y solo será utilizada para confirmar tu cita.
          </p>
        </form>
      </div>
    </div>
  );
};
