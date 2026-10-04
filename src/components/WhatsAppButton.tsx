import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { apiService } from '../data/api';

export const WhatsAppButton: React.FC = () => {
  const [whatsapp, setWhatsapp] = useState('');

  useEffect(() => {
    let active = true;
    apiService.getConfig().then((config: any) => {
      if (!active || !config) return;
      setWhatsapp(String(config.whatsapp || '').trim());
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const normalized = whatsapp.replace(/\D/g, '');
  if (!normalized) return null;

  const href = `https://wa.me/${normalized}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Contactar por WhatsApp"
      title="Hablar por WhatsApp"
      className="fixed right-5 bottom-24 lg:bottom-7 z-[60] flex items-center gap-2.5 rounded-full bg-[#25D366] px-4 py-3.5 text-white font-bold shadow-[0_10px_30px_rgba(0,0,0,.22)] hover:scale-105 transition-transform"
    >
      <MessageCircle className="w-5 h-5" />
      <span className="text-xs uppercase tracking-wider">WhatsApp</span>
    </a>
  );
};
