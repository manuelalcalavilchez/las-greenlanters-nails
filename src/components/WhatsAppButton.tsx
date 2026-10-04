import React from 'react';
import { MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '34614118598';

export const WhatsAppButton: React.FC = () => {
  const href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' +
    encodeURIComponent('Hola, vengo de la web de Las Greenlanters Nails');

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

