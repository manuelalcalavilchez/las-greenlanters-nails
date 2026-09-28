import React from 'react';
import { Heart, MapPin } from 'lucide-react';
import { GreenlantersLogo } from './GreenlantersLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#082D05] text-[#F7F8EF] pt-14 pb-24 lg:pb-14 px-4 lg:px-12 border-t border-[#8CFF00]/30">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
        <div>
          <GreenlantersLogo size={58} className="mb-5" />
          <p className="text-sm text-[#F7F8EF]/80 leading-relaxed">
            Manicura, uñas en gel y poligel, dibujos a mano y decoración personalizada en Almería.
          </p>
        </div>

        <div>
          <h4 className="font-display text-lg font-semibold text-[#8CFF00] mb-4">Servicios</h4>
          <ul className="space-y-2 text-sm text-[#F7F8EF]/80">
            <li>Uñas en gel</li>
            <li>Uñas en poligel</li>
            <li>Dibujos a mano</li>
            <li>Decoración personalizada</li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg font-semibold text-[#8CFF00] mb-4">Contacto</h4>
          <div className="space-y-3 text-sm text-[#F7F8EF]/80">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-[#8CFF00] shrink-0" />
              <span>Almería</span>
            </div>
            <a
              href="https://www.instagram.com/greenlanters.nails/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#B7FF00] transition-colors"
            >
              @greenlanters.nails
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-7 border-t border-[#F7F8EF]/10 flex flex-col sm:flex-row items-center justify-between text-xs text-[#F7F8EF]/60 gap-3">
        <p>© 2026 Las Greenlanters Nails. Todos los derechos reservados.</p>
        <p className="flex items-center gap-1">
          Hecho con <Heart className="w-3.5 h-3.5 text-[#8CFF00] fill-[#8CFF00]" /> para amantes de la manicura.
        </p>
      </div>
    </footer>
  );
};
