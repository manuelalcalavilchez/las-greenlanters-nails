import React, { useEffect, useState } from 'react';
import { Sparkles, Calendar, ArrowRight, Palette, Instagram } from 'lucide-react';
import { GreenlantersLogo } from './GreenlantersLogo';
import { apiService } from '../data/api';

type PublicService = { id: string; name: string; description?: string; active?: number | boolean; sortOrder?: number; };
type GalleryItem = { id: string; photoBase64?: string; title?: string; caption?: string; };

interface HomeViewProps { setActiveTab: (tab: string) => void; setSelectedLookStyle?: (styleId: string) => void; }

export const HomeViewV2: React.FC<HomeViewProps> = ({ setActiveTab }) => {
  const [services, setServices] = useState<PublicService[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiService.getServices(), apiService.getGallery()]).then(([serviceData, galleryData]) => {
      if (cancelled) return;
      setServices((Array.isArray(serviceData) ? serviceData : []).filter((s: PublicService) => s.active !== 0 && s.active !== false).sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
      setGallery(Array.isArray(galleryData) ? galleryData.filter((g: GalleryItem) => Boolean(g.photoBase64)) : []);
    }).catch(() => { if (!cancelled) { setServices([]); setGallery([]); } }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return <div className="min-h-screen bg-[#F7F8EF] text-[#111111]">
    <section className="relative overflow-hidden bg-[#082D05] text-white px-5 py-16 sm:py-24">
      <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#8CFF00]/10 blur-3xl" />
      <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-[#43B800]/20 blur-3xl" />
      <div className="relative z-10 max-w-6xl mx-auto grid lg:grid-cols-[1.15fr_.85fr] gap-12 items-center">
        <div className="space-y-7">
          <p className="text-[#B7FF00] text-xs font-bold uppercase tracking-[.22em]">Las Greenlanters Nails · Almería</p>
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.05]">Tus manos hablan por ti. <span className="text-[#8CFF00]">Haz que destaquen.</span></h1>
          <p className="max-w-2xl text-base sm:text-lg text-white/80 leading-relaxed">Manicurista · Técnica en uñas gel y poligel · Dibujos a mano · Decoración.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => setActiveTab('booking')} className="px-7 py-4 bg-[#8CFF00] text-[#111111] font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-[#B7FF00] transition-colors flex items-center justify-center gap-2"><Calendar className="w-4 h-4" /> Solicitar cita</button>
            <a href="https://www.instagram.com/greenlanters.nails/" target="_blank" rel="noreferrer" className="px-7 py-4 border border-[#B7FF00]/70 text-white font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center gap-2"><Instagram className="w-4 h-4 text-[#B7FF00]" /> Instagram</a>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end"><div className="greenlanters-glow rounded-full"><GreenlantersLogo size={320} className="justify-center" /></div></div>
      </div>
    </section>

    <section className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
      <div className="max-w-2xl mb-10"><p className="text-[#43B800] text-xs font-bold uppercase tracking-[.2em]">Servicios</p><h2 className="font-display text-3xl sm:text-4xl font-bold text-[#082D05] mt-2">Técnicas y decoración</h2><p className="text-[#687064] mt-3">La información se mantiene desde Staff y se refleja aquí automáticamente.</p></div>
      {loading ? <p className="text-sm text-[#687064]">Cargando…</p> : services.length === 0 ? <div className="bg-white border border-[#8CFF00]/25 rounded-xl p-7 text-[#687064]">No hay servicios activos publicados.</div> : <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{services.map(s => <article key={s.id} className="bg-white border border-[#8CFF00]/25 border-t-4 border-t-[#8CFF00] p-6 rounded-xl shadow-sm hover:-translate-y-1 transition-all"><Sparkles className="w-6 h-6 text-[#43B800] mb-5" /><h3 className="font-display text-xl font-bold text-[#082D05]">{s.name}</h3><p className="text-sm text-[#687064] mt-3 leading-relaxed">{s.description || 'Servicio personalizado.'}</p></article>)}</div>}
    </section>

    <section className="bg-white border-y border-[#8CFF00]/15"><div className="max-w-6xl mx-auto px-5 py-16 sm:py-20"><div className="flex items-end justify-between gap-5 mb-10"><div><p className="text-[#43B800] text-xs font-bold uppercase tracking-[.2em]">Galería</p><h2 className="font-display text-3xl sm:text-4xl font-bold text-[#082D05] mt-2">Trabajos reales</h2></div><button onClick={() => setActiveTab('atelier')} className="text-xs font-bold uppercase tracking-widest text-[#176B00] flex items-center gap-2">Diseñar <ArrowRight className="w-4 h-4" /></button></div>{gallery.length === 0 ? <div className="min-h-56 flex flex-col items-center justify-center border border-dashed border-[#43B800]/30 rounded-xl bg-[#F7F8EF] text-center px-6"><Palette className="w-8 h-8 text-[#43B800] mb-3" /><p className="font-semibold text-[#082D05]">La galería está pendiente de fotografías.</p><p className="text-sm text-[#687064] mt-1">Añade las imágenes reales desde Staff y aparecerán aquí.</p></div> : <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">{gallery.map((g, i) => <figure key={g.id} className={`group overflow-hidden rounded-xl bg-[#F7F8EF] ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}><img src={g.photoBase64} alt={g.title || g.caption || 'Trabajo de Las Greenlanters Nails'} loading="lazy" className="w-full h-full min-h-48 object-cover group-hover:scale-105 transition-transform duration-500" /><figcaption className="p-3 text-sm text-[#082D05]">{g.title || g.caption || 'Las Greenlanters Nails'}</figcaption></figure>)}</div>}</div></section>

    <section className="bg-[#082D05] text-white px-5 py-16 sm:py-20"><div className="max-w-4xl mx-auto text-center space-y-6"><GreenlantersLogo size={72} className="justify-center mx-auto" /><h2 className="font-display text-3xl sm:text-5xl font-bold">Nail art con personalidad.</h2><p className="text-white/75 max-w-2xl mx-auto">Almería · @greenlanters.nails</p><div className="flex flex-col sm:flex-row justify-center gap-3"><button onClick={() => setActiveTab('booking')} className="px-7 py-4 bg-[#8CFF00] text-[#111111] font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-[#B7FF00]">Solicitar cita</button><a href="https://www.instagram.com/greenlanters.nails/" target="_blank" rel="noreferrer" className="px-7 py-4 border border-white/30 rounded-lg text-xs font-bold uppercase tracking-widest hover:border-[#B7FF00]">@greenlanters.nails</a></div></div></section>
  </div>;
};
