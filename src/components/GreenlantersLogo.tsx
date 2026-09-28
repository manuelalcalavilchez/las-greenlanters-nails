import React, { useState, useEffect, useRef } from 'react';
import { Upload } from 'lucide-react';

interface GreenlantersLogoProps {
  className?: string;
  size?: number;
  allowUpload?: boolean;
}

export const GreenlantersLogo: React.FC<GreenlantersLogoProps> = ({
  className = '',
  size = 52,
  allowUpload = false,
}) => {
  const [logoSrc, setLogoSrc] = useState('/logo.png');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLogoSrc('/logo.png');
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setLogoSrc(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`flex items-center select-none relative group ${className}`}>
      {allowUpload && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleLogoUpload}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />
      )}
      <div
        role={allowUpload ? "button" : undefined}
        tabIndex={allowUpload ? 0 : undefined}
        onClick={() => allowUpload && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (allowUpload && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`rounded-full overflow-hidden border-0 shrink-0 bg-transparent flex items-center justify-center relative ${allowUpload ? 'cursor-pointer' : ''}`}
        style={{ width: size, height: size }}
        aria-label="Logo de Las Greenlanters Nails"
      >
        <img
          src={logoSrc}
          alt="Las Greenlanters Nails"
          className={`w-full h-full object-cover ${allowUpload ? 'cursor-pointer' : ''}`}
          referrerPolicy="no-referrer"
        />
        {allowUpload && (
          <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Upload className="w-5 h-5 text-[#8CFF00]" />
          </span>
        )}
      </div>
    </div>
  );
};
