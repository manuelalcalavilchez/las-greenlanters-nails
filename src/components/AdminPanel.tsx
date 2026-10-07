import React, { useState, useEffect } from 'react';
import { Calendar, Users, Palette, CheckCircle2, Clock, XCircle, Phone, Sparkles, Filter, Plus, Eye, BookmarkPlus, Lock, LogOut, Settings, Image, FileText, Trash2, Edit2, Save, X } from 'lucide-react';
import { Appointment, CustomDesign, NailCatalogStyle } from '../types';
import { apiService } from '../data/api';

// This is only a client-side local gate, not real authentication. Use server-side auth before public deployment of Staff.
const STAFF_PIN = import.meta.env.VITE_STAFF_PIN || '';

interface SalonConfig {
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  whatsapp: string;
  logo: string;
  coverPhoto: string;
  calendarPublic: boolean;
  workingHours: Array<{ day: string; open: string; close: string; enabled: boolean }>;
  blockedSlots: string[];
  vacations: string[];
  nailShapes: string[];
  nailLengths: string[];
  nailStyles: string[];
  products: string[];
  legalName: string;
  taxId: string;
  invoicePrefix: string;
  invoiceNextNumber: number;
  defaultVat: number;
  pricesIncludeVat: boolean;
  content: {
    heroEyebrow: string; heroTitle: string; heroHighlight: string; heroText: string;
    servicesEyebrow: string; servicesTitle: string; servicesIntro: string;
    galleryEyebrow: string; galleryTitle: string; galleryIntro: string;
    ctaTitle: string; ctaText: string; instagramHandle: string;
  };
  colors: {
    primary: string;
    accent: string;
    background: string;
  };
}

interface AdminPanelProps {
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  customDesigns: CustomDesign[];
  setCustomDesigns: React.Dispatch<React.SetStateAction<CustomDesign[]>>;
  catalogStyles?: NailCatalogStyle[];
  setCatalogStyles?: React.Dispatch<React.SetStateAction<NailCatalogStyle[]>>;
  onAddToCatalog?: (design: CustomDesign) => void;
}

const DEFAULT_WORKING_HOURS = [
  { day: 'Lunes', open: '10:00', close: '20:00', enabled: true },
  { day: 'Martes', open: '10:00', close: '20:00', enabled: true },
  { day: 'Miércoles', open: '10:00', close: '20:00', enabled: true },
  { day: 'Jueves', open: '10:00', close: '20:00', enabled: true },
  { day: 'Viernes', open: '10:00', close: '20:00', enabled: true },
  { day: 'Sábado', open: '10:00', close: '14:00', enabled: true },
  { day: 'Domingo', open: '10:00', close: '14:00', enabled: false }
];

const DEFAULT_CONFIG: SalonConfig = {
  name: 'Las Greenlanters Nails',
  description: 'Manicurista · Técnica en uñas gel y poligel · Dibujos a mano, decoración · Almería · Tus manos hablan por ti, haz que destaquen',
  phone: '',
  email: '',
  address: 'Almería',
  hours: '',
  whatsapp: '',
  logo: '/assets/logo.jpg',
  coverPhoto: '',
  calendarPublic: true,
  workingHours: [],
  blockedSlots: [],
  vacations: [],
  nailShapes: [],
  nailLengths: [],
  nailStyles: [],
  products: [],
  legalName: 'Las Greenlanters Nails', taxId: '', invoicePrefix: 'F', invoiceNextNumber: 1, defaultVat: 21, pricesIncludeVat: true,
  content: {
    heroEyebrow: 'Las Greenlanters Nails · Almería', heroTitle: 'Tus manos hablan por ti.', heroHighlight: 'Haz que destaquen.',
    heroText: 'Manicurista · Técnica en uñas gel y poligel · Dibujos a mano · Decoración.',
    servicesEyebrow: 'Servicios', servicesTitle: 'Técnicas y decoración', servicesIntro: 'Trabajos personalizados pensados para ti.',
    galleryEyebrow: 'Galería', galleryTitle: 'Trabajos reales', galleryIntro: 'Una selección de nuestros trabajos.',
    ctaTitle: 'Nail art con personalidad.', ctaText: 'Almería · @greenlanters.nails', instagramHandle: '@greenlanters.nails'
  },
  colors: {
    primary: '#082D05',
    accent: '#8CFF00',
    background: '#F7F8EF'
  }
};

export const AdminPanel: React.FC<AdminPanelProps> = ({
  appointments,
  setAppointments,
  customDesigns,
  setCustomDesigns,
  catalogStyles,
  setCatalogStyles,
  onAddToCatalog
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => sessionStorage.getItem('greenlanters_staff_auth') === 'true');
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'config' | 'contenidos' | 'galeria' | 'servicios' | 'especialistas' | 'agenda' | 'designs' | 'requests' | 'facturacion'>('config');
  const [selectedTech, setSelectedTech] = useState<string>('all');
  const [selectedDesignModal, setSelectedDesignModal] = useState<CustomDesign | null>(null);

  // Cabina Staff: la API/SQLite es la fuente de verdad. localStorage queda fuera de la persistencia operativa.
  const [salonConfig, setSalonConfig] = useState<SalonConfig>(DEFAULT_CONFIG);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [galleryIds, setGalleryIds] = useState<string[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [bookingRequests, setBookingRequests] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const reloadBookingRequests = async () => {
    const data = await apiService.getBookingRequests();
    setBookingRequests(Array.isArray(data) ? data : []);
  };

  const reloadStaffData = async () => {
    setIsLoadingData(true);
    try {
      const [config, apiServices, apiSpecialists, gallery, requests, apiAppointments, apiInvoices] = await Promise.all([
        apiService.getConfig(),
        apiService.getServices(),
        apiService.getSpecialists(),
        apiService.getGallery(),
        apiService.getBookingRequests(),
        apiService.getAppointments(),
        apiService.getInvoices()
      ]);

      if (config && config.id) {
        const parseArray = (value: unknown, fallback: any[] = []) => {
          if (Array.isArray(value)) return value;
          if (typeof value === 'string') {
            try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : fallback; } catch { return fallback; }
          }
          return fallback;
        };
        const loaded: SalonConfig = {
          ...DEFAULT_CONFIG,
          ...config,
          legalName: config.legalName || config.name || DEFAULT_CONFIG.legalName,
          taxId: config.taxId || '', invoicePrefix: config.invoicePrefix || 'F', invoiceNextNumber: Number(config.invoiceNextNumber) || 1,
          defaultVat: Number(config.defaultVat ?? 21), pricesIncludeVat: config.pricesIncludeVat === undefined ? true : config.pricesIncludeVat !== 0,
          calendarPublic: config.calendarPublic !== 0,
          workingHours: parseArray(config.workingHours, DEFAULT_WORKING_HOURS),
          blockedSlots: parseArray(config.blockedSlots),
          vacations: parseArray(config.vacations),
          nailShapes: parseArray(config.nailShapes, DEFAULT_CONFIG.nailShapes),
          nailLengths: parseArray(config.nailLengths, DEFAULT_CONFIG.nailLengths),
          nailStyles: parseArray(config.nailStyles, DEFAULT_CONFIG.nailStyles),
          products: parseArray(config.products),
          content: (() => {
            try { return { ...DEFAULT_CONFIG.content, ...(typeof config.content === 'string' ? JSON.parse(config.content) : (config.content || {})) }; }
            catch { return DEFAULT_CONFIG.content; }
          })(),
          colors: {
            primary: config.primaryColor || DEFAULT_CONFIG.colors.primary,
            accent: config.accentColor || DEFAULT_CONFIG.colors.accent,
            background: config.backgroundColor || DEFAULT_CONFIG.colors.background
          }
        };
        setSalonConfig(loaded);
        setEditingConfig(loaded);
      } else {
        setEditingConfig(DEFAULT_CONFIG);
      }

      setServices(Array.isArray(apiServices) ? apiServices : []);
      setSpecialists(Array.isArray(apiSpecialists) ? apiSpecialists : []);
      setGalleryPhotos(Array.isArray(gallery) ? gallery.map((g: any) => g.photoBase64).filter(Boolean) : []);
      setGalleryIds(Array.isArray(gallery) ? gallery.map((g: any) => g.id) : []);
      setBookingRequests(Array.isArray(requests) ? requests : []);
      setAppointments(Array.isArray(apiAppointments) ? apiAppointments : []);
      setInvoices(Array.isArray(apiInvoices) ? apiInvoices : []);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    reloadStaffData();
  }, []);

  // Edit states
  const [editingService, setEditingService] = useState<any | null>(null);
  const [editingSpecialist, setEditingSpecialist] = useState<any | null>(null);
  const [editingConfig, setEditingConfig] = useState<SalonConfig>(DEFAULT_CONFIG);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === STAFF_PIN) {
      sessionStorage.setItem('greenlanters_staff_auth', 'true');
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('greenlanters_staff_auth');
    setIsAuthenticated(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result as string;
      const id = `gallery_${Date.now()}`;
      const saved = await apiService.uploadPhoto({
        id,
        photoBase64: result,
        title: '',
        caption: ''
      });
      if (saved?.success) {
        setGalleryPhotos(prev => [result, ...prev]);
        setGalleryIds(prev => [id, ...prev]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfigImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'coverPhoto') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setEditingConfig(prev => ({ ...prev, [field]: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addService = async () => {
    const newService = {
      id: `s${Date.now()}`,
      name: 'Nuevo Servicio',
      duration: null,
      price: null,
      description: '',
      shortDescription: '',
      longDescription: '',
      category: 'diseno_personalizado',
      featured: false,
      sortOrder: services.length + 1,
      instagramSource: '@greenlanters.nails'
    };
    const saved = await apiService.createService(newService);
    if (saved?.success) {
      setServices(prev => [newService, ...prev]);
      setEditingService(newService);
    }
  };

  const addSpecialist = async () => {
    const newSpecialist = {
      id: `sp${Date.now()}`,
      name: 'Nueva especialista',
      role: 'Nail Artist',
      photo: '💅',
      description: ''
    };
    const saved = await apiService.createSpecialist(newSpecialist);
    if (saved?.success) {
      setSpecialists(prev => [newSpecialist, ...prev]);
      setEditingSpecialist(newSpecialist);
    }
  };

  const saveAppointmentEdits = async () => {
    if (!editingAppointment) return;
    const saved = await apiService.updateAppointment(editingAppointment.id, {
      serviceIds: editingAppointment.serviceIds, addonIds: editingAppointment.addonIds, specialistId: editingAppointment.specialistId,
      date: editingAppointment.date, time: editingAppointment.time, totalPrice: Number(editingAppointment.totalPrice) || 0,
      totalDuration: Number(editingAppointment.totalDuration) || 0, status: editingAppointment.status, notes: editingAppointment.notes || ''
    });
    if (saved?.success) { setAppointments(prev => prev.map(a => a.id === editingAppointment.id ? editingAppointment : a)); setEditingAppointment(null); alert('Cita actualizada correctamente.'); }
    else alert('No se pudo actualizar la cita.');
  };

  const createInvoiceDraft = async (appointmentId: string) => { const result = await apiService.createInvoiceDraftFromAppointment(appointmentId); if (result?.success) { setInvoices(prev => [result.invoice, ...prev]); setSelectedInvoice(result.invoice); } else alert(result?.error || 'No se pudo crear el borrador.'); };

  const saveInvoice = async () => { if (!selectedInvoice) return; const result = await apiService.updateInvoice(selectedInvoice.id, selectedInvoice); if (result?.success) { const fresh = await apiService.getInvoices(); setInvoices(Array.isArray(fresh) ? fresh : []); setSelectedInvoice((fresh || []).find((i:any)=>i.id===selectedInvoice.id) || selectedInvoice); alert('Borrador guardado.'); } else alert(result?.error || 'No se pudo guardar la factura.'); };

  const issueSelectedInvoice = async () => { if (!selectedInvoice) return; if (!selectedInvoice.clientTaxId) { alert('Introduce el NIF/CIF del cliente antes de emitir.'); return; } if (!confirm('Una vez emitida, la factura no se podrá editar. ¿Emitirla ahora?')) return; const result = await apiService.issueInvoice(selectedInvoice.id); if (result?.success) { const fresh = await apiService.getInvoices(); setInvoices(Array.isArray(fresh) ? fresh : []); setSelectedInvoice((fresh || []).find((i:any)=>i.id===selectedInvoice.id) || {...selectedInvoice,status:'Emitida',number:result.number,recordHash:result.recordHash}); alert('Factura emitida: ' + result.number); } else alert(result?.error || 'No se pudo emitir la factura.'); };

  const updateAppointmentStatus = async (id: string, status: 'Confirmada' | 'Completada' | 'Cancelada') => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    await apiService.updateAppointment(id, { status });
  };

  const updateDesignStatus = async (id: string, status: 'Pendiente' | 'Preparado en cabina' | 'Realizado') => {
    setCustomDesigns(prev => prev.map(d => d.id === id ? { ...d, status } : d));
    await apiService.updateDesign(id, { status });
  };

  // SOLICITUDES DE CITA
  const generateLocator = () => `LGN-${Math.floor(1000 + Math.random() * 9000)}`;

  const confirmBookingRequest = async (request: any) => {
    if (!request.preferredDate || !request.preferredTime) {
      alert('Para confirmar una cita primero hay que tener fecha y hora solicitadas.');
      return;
    }
    const locator = generateLocator();
    const serviceMap: Record<string, string> = { gel: 'unas-gel', poligel: 'unas-poligel', 'dibujos-a-mano': 'dibujos-a-mano', decoracion: 'decoración-personalizada', 'decoración-personalizada': 'decoración-personalizada' };
    const selectedService = services.find(s => s.id === serviceMap[request.serviceType] || s.category === request.serviceType || s.name?.toLowerCase().includes(String(request.serviceType || '').toLowerCase()));
    const newAppointment: Appointment = {
      id: `appt_${Date.now()}`,
      locator,
      serviceIds: selectedService ? [selectedService.id] : [],
      addonIds: [],
      specialistId: 'any',
      date: request.preferredDate,
      time: request.preferredTime,
      totalPrice: Number(selectedService?.price) || 0,
      totalDuration: Number(selectedService?.duration) || 0,
      clientName: request.clientName,
      clientPhone: request.clientPhone,
      clientEmail: request.clientEmail,
      notes: `Solicitud: ${request.serviceType || ''}. ${request.notes || ''}`.trim(),
      status: 'Confirmada',
      createdAt: new Date().toISOString()
    };

    const result = await apiService.createAppointment(newAppointment);
    if (result?.success) {
      setAppointments(prev => [newAppointment, ...prev]);
      await apiService.updateBookingRequest(request.id, 'Confirmada');
      await reloadBookingRequests();
      alert(`Cita creada con localizador ${locator}. Revisa la cita en Citas para confirmar especialista, servicio y precio.`);
    } else {
      alert('No se pudo crear la cita. Comprueba que la API está en marcha.');
    }
  };

  const completeBookingRequest = async (id: string) => {
    await apiService.updateBookingRequest(id, 'Completada');
    await reloadBookingRequests();
  };

  const deleteBookingRequest = async (id: string) => {
    if (!confirm('¿Eliminar esta solicitud?')) return;
    await apiService.deleteBookingRequest(id);
    await reloadBookingRequests();
  };

  const pendingRequestsCount = bookingRequests.filter(r => r.status === 'Pendiente').length;

  const filteredAppointments = selectedTech === 'all' 
    ? appointments 
    : appointments.filter(a => a.specialistId === selectedTech);

  const totalBilling = appointments.filter(a => a.status === 'Completada').reduce((acc, a) => acc + (Number(a.totalPrice) || 0), 0);
  const pendingBilling = appointments.filter(a => a.status === 'Confirmada').reduce((acc, a) => acc + (Number(a.totalPrice) || 0), 0);
  const completedCount = appointments.filter(a => a.status === 'Completada').length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#082D05] flex items-center justify-center px-4 py-16">
        <form onSubmit={handlePinSubmit} className="bg-[#F7F8EF] rounded-3xl p-8 sm:p-10 max-w-sm w-full text-center space-y-6 shadow-2xl border border-[#8CFF00]/40">
          <div className="w-16 h-16 rounded-2xl bg-[#082D05] text-[#8CFF00] flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#8CFF00]">Acceso Restringido</span>
            <h1 className="font-display text-2xl font-bold text-[#082D05] mt-1">Panel Administrativo</h1>
            <p className="text-xs text-[#082D05]/60 mt-2">Introduce el PIN para gestionar el salón.</p>
          </div>
          <div>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
              placeholder="? ? ? ?"
              className={`w-full text-center tracking-[0.5em] text-lg px-4 py-3 rounded-xl border text-[#082D05] focus:outline-none focus:ring-2 focus:ring-[#8CFF00] ${pinError ? 'border-rose-400' : 'border-neutral-300'}`}
            />
            {pinError && <p className="text-xs text-rose-500 font-semibold mt-2">PIN incorrecto.</p>}
          </div>
          <button
            type="submit"
            className="w-full py-3.5 bg-[#082D05] hover:bg-[#176B00] text-[#F7F8EF] text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
          >
            Acceder
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8EF] pb-24 lg:pb-12 px-4 lg:px-12 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#8CFF00]">Panel de Control</span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#082D05] mt-1">
              {salonConfig.name}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-white border border-neutral-200 text-[#082D05]/60 hover:text-rose-600 hover:border-rose-200 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-[#F7F8EF] p-2 rounded-2xl overflow-x-auto">
          {[
            { id: 'config', label: 'Configuración', icon: Settings },
            { id: 'contenidos', label: 'Contenidos', icon: FileText },
            { id: 'galeria', label: 'Galería', icon: Image },
            { id: 'servicios', label: 'Servicios', icon: Sparkles },
            { id: 'especialistas', label: 'Especialistas', icon: Users },
            { id: 'requests', label: 'Solicitudes', icon: BookmarkPlus },
            { id: 'facturacion', label: 'Facturación', icon: FileText },
            { id: 'agenda', label: 'Citas', icon: Calendar },
            { id: 'designs', label: 'Diseños', icon: Palette }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap relative ${
                  activeTab === tab.id ? 'bg-[#082D05] text-[#F7F8EF] shadow-sm' : 'text-[#082D05]/70 hover:text-[#082D05]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.id === 'requests' && pendingRequestsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* CONFIGURACIÓN */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-[#8CFF00]/25 p-8">
              <h2 className="font-display text-2xl font-bold text-[#082D05] mb-6">Datos del Salón</h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-[#082D05] mb-2 uppercase">Nombre</label>
                    <input
                      type="text"
                      value={editingConfig.name}
                      onChange={(e) => setEditingConfig({...editingConfig, name: e.target.value})}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CFF00]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#082D05] mb-2 uppercase">Email</label>
                    <input
                      type="email"
                      value={editingConfig.email}
                      onChange={(e) => setEditingConfig({...editingConfig, email: e.target.value})}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CFF00]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-[#082D05] mb-2 uppercase">Teléfono</label>
                    <input
                      type="tel"
                      value={editingConfig.phone}
                      onChange={(e) => setEditingConfig({...editingConfig, phone: e.target.value})}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CFF00]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#082D05] mb-2 uppercase">Dirección</label>
                    <input
                      type="text"
                      value={editingConfig.address}
                      onChange={(e) => setEditingConfig({...editingConfig, address: e.target.value})}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CFF00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#082D05] mb-2 uppercase">Descripción</label>
                  <textarea
                    value={editingConfig.description}
                    onChange={(e) => setEditingConfig({...editingConfig, description: e.target.value})}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CFF00] min-h-24"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#082D05] mb-2 uppercase">Horarios</label>
                  <textarea
                    value={editingConfig.hours}
                    onChange={(e) => setEditingConfig({...editingConfig, hours: e.target.value})}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CFF00] min-h-20"
                  />
                </div>

                <div className="rounded-2xl border border-[#8CFF00]/30 bg-[#F7F8EF] p-5 space-y-5">
                  <div><h3 className="text-sm font-bold text-[#082D05]">Facturación</h3><p className="text-[11px] text-neutral-500 mt-1">Datos que aparecerán en las facturas. El NIF/CIF es obligatorio antes de emitir una factura.</p></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className="block text-xs font-bold mb-2 uppercase">Nombre fiscal</label><input value={editingConfig.legalName} onChange={e=>setEditingConfig({...editingConfig,legalName:e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
                    <div><label className="block text-xs font-bold mb-2 uppercase">NIF / CIF</label><input value={editingConfig.taxId} onChange={e=>setEditingConfig({...editingConfig,taxId:e.target.value.toUpperCase()})} placeholder="Ej. 12345678A" className="w-full px-4 py-3 border rounded-xl font-mono" /></div>
                    <div><label className="block text-xs font-bold mb-2 uppercase">Prefijo de factura</label><input value={editingConfig.invoicePrefix} onChange={e=>setEditingConfig({...editingConfig,invoicePrefix:e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,8)})} className="w-full px-4 py-3 border rounded-xl font-mono" /></div>
                    <div><label className="block text-xs font-bold mb-2 uppercase">Siguiente número</label><input type="number" min="1" value={editingConfig.invoiceNextNumber} onChange={e=>setEditingConfig({...editingConfig,invoiceNextNumber:Number(e.target.value)||1})} className="w-full px-4 py-3 border rounded-xl" /></div>
                    <div><label className="block text-xs font-bold mb-2 uppercase">IVA (%)</label><input type="number" min="0" max="100" step="0.01" value={editingConfig.defaultVat} onChange={e=>setEditingConfig({...editingConfig,defaultVat:Number(e.target.value)})} className="w-full px-4 py-3 border rounded-xl" /></div>
                    <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 cursor-pointer"><input type="checkbox" checked={editingConfig.pricesIncludeVat} onChange={e=>setEditingConfig({...editingConfig,pricesIncludeVat:e.target.checked})} className="w-5 h-5 accent-[#082D05]" /><span><span className="block text-xs font-bold uppercase">Los precios incluyen IVA</span><span className="block text-[11px] text-neutral-500">Recomendado si los precios mostrados al público son finales.</span></span></label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-[#082D05] mb-2 uppercase">WhatsApp</label>
                    <input
                      type="tel"
                      value={editingConfig.whatsapp}
                      onChange={(e) => setEditingConfig({...editingConfig, whatsapp: e.target.value})}
                      placeholder="+34 600 000 000"
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl"
                    />
                  </div>
                  <label className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingConfig.calendarPublic}
                      onChange={(e) => setEditingConfig({...editingConfig, calendarPublic: e.target.checked})}
                      className="w-5 h-5 accent-[#082D05]"
                    />
                    <span>
                      <span className="block text-xs font-bold text-[#082D05] uppercase">Mostrar disponibilidad</span>
                      <span className="block text-[11px] text-neutral-500">Permite que el calendario público muestre disponibilidad.</span>
                    </span>
                  </label>
                </div>

                <div className="rounded-2xl border border-neutral-200 p-5 space-y-4">
                  <div>
              <h3 className="text-sm font-bold text-[#082D05]">Horario operativo por día</h3>
              <p className="text-[11px] text-neutral-500">La cabina podrá usar esta configuración para calcular disponibilidad.</p>
                  </div>
                  <div className="space-y-2">
                    {editingConfig.workingHours.map((item, index) => (
                      <div key={item.day} className="grid grid-cols-[90px_1fr_1fr_auto] gap-2 items-center">
                        <span className="text-xs font-semibold">{item.day}</span>
                        <input type="time" value={item.open} disabled={!item.enabled}
                          onChange={(e) => setEditingConfig(prev => ({...prev, workingHours: prev.workingHours.map((h,i) => i===index ? {...h, open:e.target.value} : h)}))}
                          className="px-2 py-2 border rounded-lg text-xs disabled:bg-neutral-100" />
                        <input type="time" value={item.close} disabled={!item.enabled}
                          onChange={(e) => setEditingConfig(prev => ({...prev, workingHours: prev.workingHours.map((h,i) => i===index ? {...h, close:e.target.value} : h)}))}
                          className="px-2 py-2 border rounded-lg text-xs disabled:bg-neutral-100" />
                        <input type="checkbox" checked={item.enabled}
                          onChange={(e) => setEditingConfig(prev => ({...prev, workingHours: prev.workingHours.map((h,i) => i===index ? {...h, enabled:e.target.checked} : h)}))}
                          className="w-4 h-4 accent-[#082D05]" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-[#082D05] mb-2 uppercase">Bloqueos de agenda</label>
                    <textarea
                      value={editingConfig.blockedSlots.join('\n')}
                      onChange={(e) => setEditingConfig({...editingConfig, blockedSlots: e.target.value.split('\n').map(v => v.trim()).filter(Boolean)})}
                      placeholder="2026-10-02 14:00-16:00\n2026-10-05"
                      className="w-full px-4 py-3 border rounded-xl min-h-24 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#082D05] mb-2 uppercase">Vacaciones / días cerrados</label>
                    <textarea
                      value={editingConfig.vacations.join('\n')}
                      onChange={(e) => setEditingConfig({...editingConfig, vacations: e.target.value.split('\n').map(v => v.trim()).filter(Boolean)})}
                      placeholder="2026-08-10\n2026-08-11"
                      className="w-full px-4 py-3 border rounded-xl min-h-24 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-[#082D05]">Catálogo de cabina</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      ['Formas', 'nailShapes'],
                      ['Largos', 'nailLengths'],
                      ['Estilos', 'nailStyles'],
                      ['Productos', 'products']
                    ].map(([label, key]) => (
                      <div key={key}>
                        <label className="block text-[11px] font-bold uppercase text-neutral-600 mb-2">{label}</label>
                        <textarea
                          value={(editingConfig[key as keyof SalonConfig] as string[]).join('\n')}
                          onChange={(e) => setEditingConfig({...editingConfig, [key]: e.target.value.split('\n').map(v => v.trim()).filter(Boolean)})}
                          placeholder="Un elemento por línea"
                          className="w-full px-3 py-2 border rounded-xl min-h-24 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-[#082D05] mb-2 uppercase">Color Primario</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={editingConfig.colors.primary}
                        onChange={(e) => setEditingConfig({...editingConfig, colors: {...editingConfig.colors, primary: e.target.value}})}
                        className="w-12 h-12 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editingConfig.colors.primary}
                        onChange={(e) => setEditingConfig({...editingConfig, colors: {...editingConfig.colors, primary: e.target.value}})}
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#082D05] mb-2 uppercase">Color Accent</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={editingConfig.colors.accent}
                        onChange={(e) => setEditingConfig({...editingConfig, colors: {...editingConfig.colors, accent: e.target.value}})}
                        className="w-12 h-12 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editingConfig.colors.accent}
                        onChange={(e) => setEditingConfig({...editingConfig, colors: {...editingConfig.colors, accent: e.target.value}})}
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#082D05] mb-2 uppercase">Fondo</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={editingConfig.colors.background}
                        onChange={(e) => setEditingConfig({...editingConfig, colors: {...editingConfig.colors, background: e.target.value}})}
                        className="w-12 h-12 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editingConfig.colors.background}
                        onChange={(e) => setEditingConfig({...editingConfig, colors: {...editingConfig.colors, background: e.target.value}})}
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-neutral-200">
                  <button
                    onClick={async () => {
                      const payload = {
                        ...editingConfig,
                        primaryColor: editingConfig.colors.primary,
                        accentColor: editingConfig.colors.accent,
                        backgroundColor: editingConfig.colors.background
                      };
                      const saved = await apiService.updateConfig(payload);
                      if (saved?.success) {
                        setSalonConfig(editingConfig);
                        alert('Configuración guardada en la base de datos.');
                      } else {
      alert('No se pudo guardar la configuración.');
                      }
                    }}
                    className="px-6 py-3 bg-[#082D05] text-[#F7F8EF] text-xs font-bold uppercase rounded-xl hover:bg-[#176B00] transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Configuración</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTENIDOS */}
        {activeTab === 'contenidos' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-[#8CFF00]/25 p-8">
              <div className="flex items-start justify-between gap-4 mb-6"><div><h2 className="font-display text-2xl font-bold text-[#082D05]">Contenidos de la página</h2><p className="text-sm text-neutral-600 mt-1">Edita los textos que verá la clienta en la página principal.</p></div><FileText className="w-7 h-7 text-[#43B800] shrink-0" /></div>
              <div className="space-y-6">
                {[['heroEyebrow','Etiqueta superior'],['heroTitle','Título principal'],['heroHighlight','Frase destacada'],['heroText','Descripción principal'],['servicesEyebrow','Etiqueta de servicios'],['servicesTitle','Título de servicios'],['servicesIntro','Introducción de servicios'],['galleryEyebrow','Etiqueta de galería'],['galleryTitle','Título de galería'],['galleryIntro','Introducción de galería'],['ctaTitle','Título final'],['ctaText','Texto final'],['instagramHandle','Instagram']].map(([key,label]) => (
                  <div key={key}><label className="block text-xs font-bold text-[#082D05] mb-2 uppercase">{label}</label>{['heroText','servicesIntro','galleryIntro','ctaText'].includes(key) ? <textarea value={(editingConfig.content as any)[key]} onChange={e => setEditingConfig(prev => ({...prev, content: {...prev.content, [key]: e.target.value}}))} className="w-full px-4 py-3 border border-neutral-300 rounded-xl min-h-20 focus:outline-none focus:ring-2 focus:ring-[#8CFF00]" /> : <input type="text" value={(editingConfig.content as any)[key]} onChange={e => setEditingConfig(prev => ({...prev, content: {...prev.content, [key]: e.target.value}}))} className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CFF00]" />}</div>
                ))}
                <div className="pt-4 border-t border-neutral-200 flex justify-end"><button onClick={async () => { const payload = {...editingConfig, primaryColor: editingConfig.colors.primary, accentColor: editingConfig.colors.accent, backgroundColor: editingConfig.colors.background}; const saved = await apiService.updateConfig(payload); if (saved?.success) { setSalonConfig(editingConfig); alert('Contenidos guardados.'); } else alert('No se pudieron guardar los contenidos.'); }} className="px-6 py-3 bg-[#082D05] text-[#F7F8EF] text-xs font-bold uppercase rounded-xl hover:bg-[#176B00] flex items-center gap-2"><Save className="w-4 h-4" /> Guardar Contenidos</button></div>
              </div>
            </div>
          </div>
        )}

        {/* GALERÍA */}
        {activeTab === 'galeria' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-[#8CFF00]/25 p-8">
              <h2 className="font-display text-2xl font-bold text-[#082D05] mb-6">Galería de Fotos</h2>
              
              <div className="mb-8">
                <label className="block">
                  <div className="border-2 border-dashed border-[#8CFF00]/40 rounded-2xl p-8 text-center cursor-pointer hover:bg-[#F7F8EF] transition-all">
                    <Image className="w-8 h-8 mx-auto mb-3 text-[#8CFF00]" />
                    <p className="text-sm font-semibold text-[#082D05] mb-1">Sube fotos de tu salón</p>
                    <p className="text-xs text-neutral-500">JPG, PNG - Máx 10MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {galleryPhotos.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {galleryPhotos.map((photo, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square">
                      <img src={photo} alt={`Foto ${idx}`} className="w-full h-full object-cover" />
                      <button
                        onClick={async () => {
                          const id = galleryIds[idx];
                          if (id) {
                            const deleted = await apiService.deletePhoto(id);
                            if (!deleted?.success) return;
                          }
                          setGalleryPhotos(prev => prev.filter((_, i) => i !== idx));
                          setGalleryIds(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="absolute inset-0 bg-black/0 group-hover:bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-6 h-6 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SERVICIOS */}
        {activeTab === 'servicios' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-display text-2xl font-bold text-[#082D05]">Servicios & Precios</h2>
              <button
                onClick={addService}
                className="px-4 py-2 bg-[#082D05] text-[#F7F8EF] text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-[#176B00]"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Servicio</span>
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-[#8CFF00]/25 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#F7F8EF] border-b border-neutral-200 text-[#082D05] uppercase font-semibold">
                    <tr>
                      <th className="p-4 text-left">Servicio</th>
                      <th className="p-4 text-center">Duración (min)</th>
                      <th className="p-4 text-center">Precio (€)</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {services.map(svc => (
                      <tr key={svc.id} className="hover:bg-neutral-50">
                        <td className="p-4">
                          {editingService?.id === svc.id ? (
                            <input
                              type="text"
                              value={editingService.name}
                              onChange={(e) => setEditingService({...editingService, name: e.target.value})}
                              className="px-3 py-2 border border-neutral-300 rounded-lg text-xs w-full"
                            />
                          ) : (
                            <span className="font-semibold text-[#082D05]">{svc.name}</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {editingService?.id === svc.id ? (
                            <input
                              type="number"
                              value={editingService.duration}
                              onChange={(e) => setEditingService({...editingService, duration: parseInt(e.target.value)})}
                              className="px-3 py-2 border border-neutral-300 rounded-lg text-xs w-20 mx-auto"
                            />
                          ) : (
                            svc.duration == null ? '-' : svc.duration
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {editingService?.id === svc.id ? (
                            <input
                              type="number"
                              value={editingService.price}
                              onChange={(e) => setEditingService({...editingService, price: parseFloat(e.target.value)})}
                              className="px-3 py-2 border border-neutral-300 rounded-lg text-xs w-20 mx-auto"
                            />
                          ) : (
                            <span className="font-bold text-[#8CFF00]">{svc.price}€</span>
                          )}
                        </td>
                        <td className="p-4 text-center space-x-2">
                          {editingService?.id === svc.id ? (
                            <>
                              <button
                                onClick={async () => {
                                  const saved = await apiService.updateService(editingService.id, editingService);
                                  if (saved?.success) {
                                    setServices(prev => prev.map(s => s.id === editingService.id ? editingService : s));
                                    setEditingService(null);
                                  }
                                }}
                                className="px-2 py-1 bg-[#082D05] text-[#F7F8EF] rounded text-[10px] font-bold hover:bg-[#176B00]"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditingService(null)}
                                className="px-2 py-1 bg-neutral-200 text-neutral-700 rounded text-[10px] font-bold hover:bg-neutral-300"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingService(svc)}
                                className="px-2 py-1 bg-neutral-100 text-[#082D05] rounded text-[10px] font-bold hover:bg-neutral-200"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={async () => {
                                  const deleted = await apiService.deleteService(svc.id);
                                  if (deleted?.success) setServices(prev => prev.filter(s => s.id !== svc.id));
                                }}
                                className="px-2 py-1 bg-rose-100 text-rose-700 rounded text-[10px] font-bold hover:bg-rose-200"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ESPECIALISTAS */}
        {activeTab === 'especialistas' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-display text-2xl font-bold text-[#082D05]">Equipo de Especialistas</h2>
              <button
                onClick={addSpecialist}
                className="px-4 py-2 bg-[#082D05] text-[#F7F8EF] text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-[#176B00]"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Especialista</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {specialists.map(spec => (
                <div key={spec.id} className="bg-white rounded-2xl border border-[#8CFF00]/30 p-6 space-y-4">
                  <div className="text-4xl text-center mb-3">{spec.photo}</div>
                  {editingSpecialist?.id === spec.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingSpecialist.name}
                        onChange={(e) => setEditingSpecialist({...editingSpecialist, name: e.target.value})}
                        placeholder="Nombre"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        value={editingSpecialist.role}
                        onChange={(e) => setEditingSpecialist({...editingSpecialist, role: e.target.value})}
                        placeholder="Cargo"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const saved = await apiService.updateSpecialist(editingSpecialist.id, editingSpecialist);
                            if (saved?.success) {
                              setSpecialists(prev => prev.map(s => s.id === editingSpecialist.id ? editingSpecialist : s));
                              setEditingSpecialist(null);
                            }
                          }}
                          className="flex-1 px-3 py-2 bg-[#082D05] text-[#F7F8EF] rounded-lg text-xs font-bold hover:bg-[#176B00]"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingSpecialist(null)}
                          className="flex-1 px-3 py-2 bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="font-bold text-[#082D05] text-center">{spec.name}</h3>
                        <p className="text-xs text-neutral-500 text-center">{spec.role}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingSpecialist(spec)}
                          className="flex-1 px-3 py-2 bg-neutral-100 text-[#082D05] rounded-lg text-xs font-bold hover:bg-neutral-200"
                        >
                          Editar
                        </button>
                        <button
                          onClick={async () => {
                            const deleted = await apiService.deleteSpecialist(spec.id);
                            if (deleted?.success) setSpecialists(prev => prev.filter(s => s.id !== spec.id));
                          }}
                          className="flex-1 px-3 py-2 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-200"
                        >
                          Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SOLICITUDES DE CITA */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-[#8CFF00]/25 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-[#082D05]">Solicitudes de Cita</h2>
                <span className="text-xs font-semibold text-neutral-500">{pendingRequestsCount} pendiente(s)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8EF] border-b border-neutral-200 text-[#082D05] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Contacto</th>
                      <th className="p-4">Servicio</th>
                      <th className="p-4">Fecha/Hora Preferida</th>
                      <th className="p-4">Notas</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {bookingRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-neutral-400">
                          No hay solicitudes de cita todavía.
                        </td>
                      </tr>
                    ) : (
                      bookingRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-neutral-50/50 transition-colors align-top">
                          <td className="p-4 font-bold text-[#082D05]">{req.clientName}</td>
                          <td className="p-4">
                            <span className="block">{req.clientPhone}</span>
                            <span className="block text-[11px] text-neutral-500">{req.clientEmail}</span>
                          </td>
                          <td className="p-4 font-medium">{req.serviceType}</td>
                          <td className="p-4 font-medium">{req.preferredDate || '—'} {req.preferredTime ? `· ${req.preferredTime}h` : ''}</td>
                          <td className="p-4 max-w-xs truncate text-neutral-600">{req.notes || '—'}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${
                              req.status === 'Pendiente' ? 'bg-amber-100 text-amber-800' :
                              req.status === 'Confirmada' ? 'bg-[#8CFF00]/20 text-[#082D05]' :
                              req.status === 'Completada' ? 'bg-[#082D05] text-[#F7F8EF]' :
                              'bg-neutral-100 text-neutral-600'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2 whitespace-nowrap">
                            {req.status === 'Pendiente' && (
                              <button
                                onClick={() => confirmBookingRequest(req)}
                                className="px-2.5 py-1 bg-[#082D05] text-[#F7F8EF] rounded text-[11px] font-semibold hover:bg-[#176B00]"
                              >
                                Confirmar
                              </button>
                            )}
                            {req.status !== 'Completada' && (
                              <button
                                onClick={() => completeBookingRequest(req.id)}
                                className="px-2.5 py-1 bg-[#8CFF00]/20 text-[#082D05] rounded text-[11px] font-semibold hover:bg-[#8CFF00]/30"
                              >
                                Completar
                              </button>
                            )}
                            <button
                              onClick={() => deleteBookingRequest(req.id)}
                              className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded text-[11px] font-semibold hover:bg-rose-200"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* FACTURACIÓN */}
        {activeTab === 'facturacion' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-xs text-amber-900"><strong>Importante:</strong> este módulo organiza y registra las facturas del negocio. La emisión incorpora numeración y huella de auditoría, pero la conexión automática con los servicios VERI*FACTU de la AEAT todavía debe configurarse antes de presentarlo como sistema fiscal plenamente adaptado.</div>
            <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
              <div className="bg-white rounded-3xl border border-[#8CFF00]/25 p-6">
                <div className="flex items-center justify-between mb-5"><div><h2 className="font-display text-2xl font-bold text-[#082D05]">Facturas</h2><p className="text-xs text-neutral-500 mt-1">Borradores y facturas emitidas</p></div><span className="text-xs font-bold bg-[#F7F8EF] px-3 py-2 rounded-full">{invoices.length}</span></div>
                <div className="space-y-2 max-h-[600px] overflow-auto">
                  {invoices.length === 0 ? <p className="text-sm text-neutral-400 py-8 text-center">Todavía no hay facturas.</p> : invoices.map((inv:any)=><button key={inv.id} onClick={()=>setSelectedInvoice(inv)} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedInvoice?.id===inv.id?'border-[#8CFF00] bg-[#F7F8EF]':'border-neutral-200 hover:border-neutral-300'}`}>
                    <div className="flex justify-between gap-3"><strong className="text-sm text-[#082D05]">{inv.number || 'Borrador'}</strong><span className={`text-[10px] font-bold uppercase ${inv.status==='Emitida'?'text-[#176B00]':inv.status==='Anulada'?'text-rose-600':'text-amber-700'}`}>{inv.status}</span></div>
                    <div className="text-xs text-neutral-600 mt-1">{inv.clientName || 'Sin cliente'} · {Number(inv.total||0).toFixed(2)} €</div>
                    <div className="text-[10px] text-neutral-400 mt-1">{inv.issueDate}</div>
                  </button>)}
                </div>
              </div>

              <div className="space-y-6">
                {!selectedInvoice ? <div className="bg-white rounded-3xl border border-[#8CFF00]/25 p-8"><h3 className="font-display text-xl font-bold text-[#082D05]">Crear una factura</h3><p className="text-sm text-neutral-600 mt-2 mb-6">Selecciona una cita para crear un borrador. Podrás revisar todos los datos antes de emitirla.</p><div className="space-y-2">{appointments.filter(a=>a.status==='Completada').map(a=>{const has=invoices.some(i=>i.appointmentId===a.id && i.status!=='Anulada');return <div key={a.id} className="flex items-center justify-between gap-4 p-4 border rounded-xl"><div><strong className="text-sm">{a.clientName}</strong><div className="text-xs text-neutral-500">{a.locator} · {a.date} {a.time} · {Number(a.totalPrice||0).toFixed(2)} €</div></div><button disabled={has} onClick={()=>createInvoiceDraft(a.id)} className="px-4 py-2 bg-[#082D05] text-[#F7F8EF] rounded-xl text-xs font-bold disabled:opacity-40">{has?'Ya facturada':'Crear borrador'}</button></div>})}</div></div> : <div className="bg-white rounded-3xl border border-[#8CFF00]/25 p-7 space-y-6">
                  <div className="flex items-center justify-between gap-4"><div><span className="text-[10px] uppercase font-bold tracking-widest text-[#43B800]">{selectedInvoice.status}</span><h3 className="font-display text-2xl font-bold text-[#082D05]">{selectedInvoice.number || 'Borrador de factura'}</h3></div><button onClick={()=>setSelectedInvoice(null)} className="p-2 rounded-lg bg-neutral-100"><X className="w-4 h-4"/></button></div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold mb-2 uppercase">Cliente</label><input disabled={selectedInvoice.status==='Emitida'} value={selectedInvoice.clientName||''} onChange={e=>setSelectedInvoice({...selectedInvoice,clientName:e.target.value})} className="w-full px-3 py-3 border rounded-xl"/></div>
                    <div><label className="block text-xs font-bold mb-2 uppercase">NIF / CIF cliente</label><input disabled={selectedInvoice.status==='Emitida'} value={selectedInvoice.clientTaxId||''} onChange={e=>setSelectedInvoice({...selectedInvoice,clientTaxId:e.target.value.toUpperCase()})} className="w-full px-3 py-3 border rounded-xl font-mono"/></div>
                    <div><label className="block text-xs font-bold mb-2 uppercase">Email</label><input disabled={selectedInvoice.status==='Emitida'} value={selectedInvoice.clientEmail||''} onChange={e=>setSelectedInvoice({...selectedInvoice,clientEmail:e.target.value})} className="w-full px-3 py-3 border rounded-xl"/></div>
                    <div><label className="block text-xs font-bold mb-2 uppercase">Dirección fiscal</label><input disabled={selectedInvoice.status==='Emitida'} value={selectedInvoice.clientAddress||''} onChange={e=>setSelectedInvoice({...selectedInvoice,clientAddress:e.target.value})} className="w-full px-3 py-3 border rounded-xl"/></div>
                  </div>
                  <div><div className="flex justify-between items-center mb-3"><h4 className="text-sm font-bold text-[#082D05]">Líneas</h4>{selectedInvoice.status!=='Emitida'&&<button onClick={()=>setSelectedInvoice({...selectedInvoice,lines:[...(selectedInvoice.lines||[]),{description:'Nuevo servicio',quantity:1,unitPrice:0}]})} className="text-xs font-bold text-[#176B00]">+ Añadir línea</button>}</div>
                    <div className="space-y-2">{(selectedInvoice.lines||[]).map((line:any,i:number)=><div key={i} className="grid grid-cols-[1fr_80px_110px_auto] gap-2"><input disabled={selectedInvoice.status==='Emitida'} value={line.description||''} onChange={e=>{const lines=[...selectedInvoice.lines];lines[i]={...line,description:e.target.value};setSelectedInvoice({...selectedInvoice,lines});}} className="px-3 py-2 border rounded-lg text-xs"/><input disabled={selectedInvoice.status==='Emitida'} type="number" min="1" value={line.quantity} onChange={e=>{const lines=[...selectedInvoice.lines];lines[i]={...line,quantity:Number(e.target.value)||1};setSelectedInvoice({...selectedInvoice,lines});}} className="px-3 py-2 border rounded-lg text-xs"/><input disabled={selectedInvoice.status==='Emitida'} type="number" min="0" step="0.01" value={line.unitPrice} onChange={e=>{const lines=[...selectedInvoice.lines];lines[i]={...line,unitPrice:Number(e.target.value)||0};setSelectedInvoice({...selectedInvoice,lines});}} className="px-3 py-2 border rounded-lg text-xs"/>{selectedInvoice.status!=='Emitida'&&<button onClick={()=>setSelectedInvoice({...selectedInvoice,lines:selectedInvoice.lines.filter((_:any,j:number)=>j!==i)})} className="px-2 text-rose-600"><Trash2 className="w-4 h-4"/></button>}</div>)}</div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4"><div><label className="block text-xs font-bold mb-2 uppercase">IVA (%)</label><input disabled={selectedInvoice.status==='Emitida'} type="number" value={selectedInvoice.vatRate} onChange={e=>setSelectedInvoice({...selectedInvoice,vatRate:Number(e.target.value)})} className="w-full px-3 py-3 border rounded-xl"/></div><div><label className="block text-xs font-bold mb-2 uppercase">Forma de pago</label><select disabled={selectedInvoice.status==='Emitida'} value={selectedInvoice.paymentMethod||''} onChange={e=>setSelectedInvoice({...selectedInvoice,paymentMethod:e.target.value})} className="w-full px-3 py-3 border rounded-xl"><option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option><option>Bizum</option></select></div><div><label className="block text-xs font-bold mb-2 uppercase">Total</label><div className="px-3 py-3 bg-[#F7F8EF] rounded-xl font-bold text-[#082D05]">{Number(selectedInvoice.total||0).toFixed(2)} €</div></div></div>
                  <div><label className="block text-xs font-bold mb-2 uppercase">Notas</label><textarea disabled={selectedInvoice.status==='Emitida'} value={selectedInvoice.notes||''} onChange={e=>setSelectedInvoice({...selectedInvoice,notes:e.target.value})} className="w-full px-3 py-3 border rounded-xl min-h-20"/></div>
                  <div className="flex flex-wrap justify-end gap-2">{selectedInvoice.status!=='Emitida'&&<><button onClick={saveInvoice} className="px-4 py-2 bg-neutral-200 rounded-xl text-xs font-bold">Guardar borrador</button><button onClick={issueSelectedInvoice} className="px-5 py-2 bg-[#082D05] text-[#F7F8EF] rounded-xl text-xs font-bold">Emitir factura</button></>}{selectedInvoice.status==='Emitida'&&<button onClick={()=>window.print()} className="px-5 py-2 bg-[#082D05] text-[#F7F8EF] rounded-xl text-xs font-bold">Imprimir / Guardar PDF</button>}</div>
                  {selectedInvoice.status==='Emitida'&&<div className="text-[10px] text-neutral-500 break-all border-t pt-4">Huella de auditoría: {selectedInvoice.recordHash || '—'}</div>}
                </div>}
              </div>
            </div>
          </div>
        )}

        {/* AGENDA - Lo que ya existía */}
        {activeTab === 'agenda' && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-xs text-amber-900"><strong>Control interno:</strong> estos importes sirven para controlar citas e ingresos previstos. Esta pantalla no sustituye una factura fiscal ni un sistema VERI*FACTU.</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-[#8CFF00]/30 shadow-sm">
                <span className="text-xs font-semibold text-neutral-500 block mb-1">Facturación de citas completadas</span>
                <span className="font-display text-3xl font-bold text-[#082D05]">{totalBilling.toFixed(2)}€</span>
                <span className="text-[11px] text-neutral-500">Total de citas marcadas como completadas</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm">
                <span className="text-xs font-semibold text-neutral-500 block mb-1">Importe de citas confirmadas</span>
                <span className="font-display text-3xl font-bold text-amber-700">{pendingBilling.toFixed(2)}€</span>
                <span className="text-[11px] text-neutral-500">Citas aún no completadas</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-[#8CFF00]/30 shadow-sm">
                <span className="text-xs font-semibold text-neutral-500 block mb-1">Citas Totales</span>
                <span className="font-display text-3xl font-bold text-[#082D05]">{appointments.length}</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-[#8CFF00]/30 shadow-sm">
                <span className="text-xs font-semibold text-neutral-500 block mb-1">Citas Completadas</span>
                <span className="font-display text-3xl font-bold text-[#8CFF00]">{completedCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              <span className="text-xs font-semibold text-[#082D05] flex items-center gap-1.5 shrink-0">
                <Filter className="w-3.5 h-3.5" /> Filtrar:
              </span>
              {[{ id: 'all', name: 'Todas' }, ...specialists.map(s => ({ id: s.id, name: s.name }))].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTech(t.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all shrink-0 ${
                    selectedTech === t.id ? 'bg-[#082D05] text-[#F7F8EF] border-[#082D05]' : 'bg-white text-[#082D05] border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {editingAppointment && (
              <div className="bg-white rounded-3xl border border-[#8CFF00]/30 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between gap-4"><div><h3 className="font-display text-xl font-bold text-[#082D05]">Editar cita {editingAppointment.locator}</h3><p className="text-xs text-neutral-500 mt-1">Corrige servicio, especialista, fecha, precio, duración o estado.</p></div><button onClick={() => setEditingAppointment(null)} className="p-2 rounded-lg bg-neutral-100"><X className="w-4 h-4" /></button></div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2"><label className="block text-xs font-bold mb-2 uppercase">Servicios</label><select multiple value={editingAppointment.serviceIds} onChange={e => setEditingAppointment({...editingAppointment, serviceIds: Array.from(e.target.selectedOptions).map(o => o.value)})} className="w-full min-h-24 px-3 py-2 border rounded-xl text-xs">{services.map(s => <option key={s.id} value={s.id}>{s.name} · {s.price ?? 0}€</option>)}</select></div>
                  <div><label className="block text-xs font-bold mb-2 uppercase">Especialista</label><select value={editingAppointment.specialistId} onChange={e => setEditingAppointment({...editingAppointment, specialistId: e.target.value})} className="w-full px-3 py-3 border rounded-xl text-xs">{specialists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                  <div><label className="block text-xs font-bold mb-2 uppercase">Estado</label><select value={editingAppointment.status} onChange={e => setEditingAppointment({...editingAppointment, status: e.target.value as Appointment['status']})} className="w-full px-3 py-3 border rounded-xl text-xs"><option>Confirmada</option><option>Completada</option><option>Cancelada</option></select></div>
                  <div><label className="block text-xs font-bold mb-2 uppercase">Fecha</label><input type="date" value={editingAppointment.date} onChange={e => setEditingAppointment({...editingAppointment, date:e.target.value})} className="w-full px-3 py-3 border rounded-xl text-xs" /></div>
                  <div><label className="block text-xs font-bold mb-2 uppercase">Hora</label><input type="time" value={editingAppointment.time} onChange={e => setEditingAppointment({...editingAppointment, time:e.target.value})} className="w-full px-3 py-3 border rounded-xl text-xs" /></div>
                  <div><label className="block text-xs font-bold mb-2 uppercase">Precio / total (€)</label><input type="number" min="0" step="0.01" value={editingAppointment.totalPrice} onChange={e => setEditingAppointment({...editingAppointment, totalPrice:Number(e.target.value)})} className="w-full px-3 py-3 border rounded-xl text-xs" /></div>
                  <div><label className="block text-xs font-bold mb-2 uppercase">Duración (min)</label><input type="number" min="0" value={editingAppointment.totalDuration} onChange={e => setEditingAppointment({...editingAppointment, totalDuration:Number(e.target.value)})} className="w-full px-3 py-3 border rounded-xl text-xs" /></div>
                </div>
                <div><label className="block text-xs font-bold mb-2 uppercase">Notas</label><textarea value={editingAppointment.notes || ''} onChange={e => setEditingAppointment({...editingAppointment, notes:e.target.value})} className="w-full px-3 py-3 border rounded-xl text-xs min-h-20" /></div>
                <div className="flex justify-end gap-2"><button onClick={() => setEditingAppointment(null)} className="px-4 py-2 bg-neutral-200 rounded-xl text-xs font-bold">Cancelar</button><button onClick={saveAppointmentEdits} className="px-5 py-2 bg-[#082D05] text-[#F7F8EF] rounded-xl text-xs font-bold flex items-center gap-2"><Save className="w-4 h-4" /> Guardar cambios</button></div>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-[#8CFF00]/25 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8EF] border-b border-neutral-200 text-[#082D05] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="p-4">Localizador</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Servicios</th>
                      <th className="p-4">Especialista</th>
                      <th className="p-4">Fecha & Hora</th>
                      <th className="p-4">Total</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-neutral-400">
                          No hay citas con este filtro.
                        </td>
                      </tr>
                    ) : (
                      filteredAppointments.map((appt) => {
                        const staffObj = specialists.find(s => s.id === appt.specialistId);
                        const serviceNames = appt.serviceIds.map(id => services.find(s => s.id === id)?.name).join(', ');

                        return (
                          <tr key={appt.id} className="hover:bg-neutral-50/50 transition-colors">
                            <td className="p-4 font-mono font-bold text-[#8CFF00]">{appt.locator}</td>
                            <td className="p-4">
                              <span className="font-bold block text-[#082D05]">{appt.clientName}</span>
                              <span className="text-[11px] text-neutral-500">{appt.clientPhone}</span>
                            </td>
                            <td className="p-4 max-w-xs truncate text-neutral-700">{serviceNames}</td>
                            <td className="p-4 font-medium">{staffObj?.name || 'Cualquiera'}</td>
                <td className="p-4 font-medium">{appt.date} · {appt.time}h</td>
                            <td className="p-4 font-bold font-display">{appt.totalPrice}€</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${
                                appt.status === 'Confirmada' ? 'bg-[#8CFF00]/20 text-[#082D05]' :
                                appt.status === 'Completada' ? 'bg-[#082D05] text-[#F7F8EF]' :
                                'bg-rose-100 text-rose-700'
                              }`}>
                                {appt.status}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2 whitespace-nowrap">
                              <button onClick={() => setEditingAppointment({...appt})} className="px-2.5 py-1 bg-neutral-100 text-[#082D05] rounded text-[11px] font-semibold hover:bg-neutral-200">Editar</button>
                              {appt.status !== 'Completada' && (
                                <button
                                  onClick={() => updateAppointmentStatus(appt.id, 'Completada')}
                                  className="px-2.5 py-1 bg-[#082D05] text-[#F7F8EF] rounded text-[11px] font-semibold hover:bg-[#176B00]"
                                >
                                  Completar
                                </button>
                              )}
                              {appt.status !== 'Cancelada' && (
                                <button
                                  onClick={() => updateAppointmentStatus(appt.id, 'Cancelada')}
                                  className="px-2.5 py-1 bg-neutral-200 text-neutral-800 rounded text-[11px] font-semibold hover:bg-neutral-300"
                                >
                                  Cancelar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* DISEÑOS */}
        {activeTab === 'designs' && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-bold text-[#082D05]">Diseños del Atelier</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {customDesigns.length === 0 ? (
                <div className="col-span-full py-16 text-center text-neutral-400 bg-white rounded-3xl border border-neutral-200">
                  No hay diseños personalizados creados.
                </div>
              ) : (
                customDesigns.map((des) => (
                  <div key={des.id} className="bg-white rounded-2xl overflow-hidden border border-[#8CFF00]/30 shadow-sm flex flex-col">
                    <div className="aspect-[4/3] bg-neutral-900 relative overflow-hidden flex items-center justify-center p-4">
                      <img 
                        src={des.imageBase64} 
                        alt="Boceto uña" 
                        className="max-h-full object-contain rounded-lg shadow-md border border-[#8CFF00]/40" 
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#082D05] text-[#F7F8EF] font-mono text-[10px] rounded-md">
                        {des.code}
                      </span>
                    </div>

                    <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-display font-bold text-[#082D05]">{des.clientName}</h3>
                        </div>
                        <p className="text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 italic">
                          "{des.notes}"
                        </p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-neutral-100">
                        <select
                          value={des.status}
                          onChange={(e) => updateDesignStatus(des.id, e.target.value as any)}
                          className="w-full text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#F7F8EF] border border-[#8CFF00]/40 text-[#082D05]"
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="Preparado en cabina">Preparado en cabina</option>
                          <option value="Realizado">Realizado</option>
                        </select>

                        <button
                          onClick={() => setSelectedDesignModal(des)}
                          className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-[#082D05] text-xs font-semibold rounded-xl"
                        >
                          Ver Detalles
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

            {/* Modal diseño */}
        {selectedDesignModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 relative border border-[#8CFF00]/40 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold text-[#082D05]">Diseño {selectedDesignModal.code}</h3>
                <button 
                  onClick={() => setSelectedDesignModal(null)}
                  className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center font-bold hover:bg-neutral-200"
                >
                  👁️
                </button>
              </div>

              <div className="bg-neutral-900 p-4 rounded-2xl flex items-center justify-center">
                <img src={selectedDesignModal.imageBase64} alt="Ampliación" className="max-h-96 object-contain rounded-xl" />
              </div>

              <div className="space-y-2 text-xs">
                <p><strong>Cliente:</strong> {selectedDesignModal.clientName}</p>
                <p><strong>Teléfono:</strong> {selectedDesignModal.clientPhone}</p>
                <p><strong>Notas:</strong> {selectedDesignModal.notes}</p>
                <p><strong>Forma:</strong> {selectedDesignModal.shape}</p>
              </div>

              <button
                onClick={() => setSelectedDesignModal(null)}
                className="w-full py-3 bg-[#082D05] text-[#F7F8EF] text-xs font-bold uppercase rounded-xl hover:bg-[#176B00]"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

