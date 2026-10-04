import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RotateCcw, Sparkles, Sliders, Calendar, ArrowRight, Eye, Check, Move, ZoomIn, ZoomOut } from 'lucide-react';
import { NAIL_STYLES_CATALOG } from '../data/mockData';
import { NailShape, NailLength, NailStyleId, NailCatalogStyle } from '../types';

interface VirtualTryOnProps {
  setActiveTab: (tab: string) => void;
  selectedLookStyle?: string;
  catalogStyles?: NailCatalogStyle[];
}

interface FingerTransform {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

interface HandTransform {
  x: number;
  y: number;
  scale: number;
}

const DEFAULT_FINGERS: Record<string, FingerTransform> = {
  thumb: { x: -60, y: 40, rotation: -25, scale: 1 },
  index: { x: -25, y: -40, rotation: -8, scale: 1 },
  middle: { x: 5, y: -50, rotation: 0, scale: 1 },
  ring: { x: 35, y: -45, rotation: 8, scale: 1 },
  pinky: { x: 65, y: -20, rotation: 20, scale: 1 }
};

const MODEL_HANDS = [
  'https://images.unsplash.com/photo-1632345031435-8727f6c97d34?q=80&w=900&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=900&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=900&auto=format&fit=crop'
];

export const VirtualTryOn: React.FC<VirtualTryOnProps> = ({ setActiveTab, selectedLookStyle, catalogStyles }) => {
  const [imageSrc, setImageSrc] = useState<string>(MODEL_HANDS[0]);
  const stylesToUse = catalogStyles && catalogStyles.length > 0 ? catalogStyles : NAIL_STYLES_CATALOG;
  const [activeStyle, setActiveStyle] = useState<NailStyleId>((selectedLookStyle as NailStyleId) || stylesToUse[0].id);
  const [activeShape, setActiveShape] = useState<NailShape>('almond');
  const [activeLength, setActiveLength] = useState<NailLength>('medium');
  const [selectedFinger, setSelectedFinger] = useState<string>('index');
  const [fingers, setFingers] = useState<Record<string, FingerTransform>>(DEFAULT_FINGERS);
  const [handTransform, setHandTransform] = useState<HandTransform>({ x: 0, y: 0, scale: 1 });
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [activeTabPanel, setActiveTabPanel] = useState<'style' | 'shape' | 'calibrate'>('style');
  const [calibrateTarget, setCalibrateTarget] = useState<'nails' | 'hand'>('nails');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [draggingType, setDraggingType] = useState<'none' | 'hand' | 'nail'>('none');
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTransformChange = (key: keyof FingerTransform, delta: number) => {
    setFingers(prev => ({
      ...prev,
      [selectedFinger]: {
        ...prev[selectedFinger],
        [key]: prev[selectedFinger][key] + delta
      }
    }));
  };

  const handleHandTransformChange = (key: keyof HandTransform, delta: number) => {
    setHandTransform(prev => ({
      ...prev,
      [key]: prev[key] + delta
    }));
  };

  const resetAll = () => {
    setFingers(DEFAULT_FINGERS);
    setHandTransform({ x: 0, y: 0, scale: 1 });
  };

  const handleMouseDownViewer = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setDraggingType('hand');
    setDragStart({ x: clientX, y: clientY });
  };

  const handleMouseDownNail = (e: React.MouseEvent, fingerKey: string) => {
    e.stopPropagation();
    setSelectedFinger(fingerKey);
    setDraggingType('nail');
    setDragStart({ x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (draggingType === 'none') return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const movementX = clientX - dragStart.x;
    const movementY = clientY - dragStart.y;

    if (draggingType === 'hand') {
      setHandTransform(prev => ({
        ...prev,
        x: prev.x + (movementX * 0.7),
        y: prev.y + (movementY * 0.7)
      }));
    } else if (draggingType === 'nail') {
      setFingers(prev => ({
        ...prev,
        [selectedFinger]: {
          ...prev[selectedFinger],
          x: prev[selectedFinger].x + movementX * 0.8,
          y: prev[selectedFinger].y + movementY * 0.8
        }
      }));
    }
    setDragStart({ x: clientX, y: clientY });
  };

  const handleMouseUp = () => {
    setDraggingType('none');
  };

  const currentStyleObj = stylesToUse.find(s => s.id === activeStyle) || stylesToUse[0];

  const getShapeStyle = (shape: NailShape, length: NailLength) => {
    let width = 'w-9';
    let height = length === 'short' ? 'h-13' : length === 'long' ? 'h-22' : 'h-17';
    let borderRadius = 'rounded-t-[44%] rounded-b-xl';

    switch (shape) {
      case 'almond':
        borderRadius = 'rounded-t-[50%] rounded-b-2xl';
        break;
      case 'coffin':
        borderRadius = 'rounded-t-md rounded-b-xs';
        break;
      case 'square':
        borderRadius = 'rounded-t-sm rounded-b-none';
        break;
      case 'oval':
        borderRadius = 'rounded-t-[60%] rounded-b-lg';
        break;
      case 'stiletto':
        borderRadius = 'rounded-t-[90%] rounded-b-xs';
        width = 'w-7';
        break;
    }
    return `${width} ${height} ${borderRadius}`;
  };

  return (
    <div className="min-h-screen bg-[#F7F8EF] pb-24 lg:pb-12 px-4 lg:px-8 py-6 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 border-b border-[#8CFF00]/25 pb-4">
          <div>
            <span className="px-3 py-1 bg-[#8CFF00]/20 text-[#8CFF00] text-[10px] font-bold uppercase tracking-widest rounded-full">
              Simulador Interactivo Pro
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#082D05] mt-1">
              Probador Virtual de Uñas
            </h1>
          </div>
          <p className="text-xs text-neutral-600 max-w-sm">
            Modifica en tiempo real formas, longitudes y estilos sobre manos modelo o sube tu propia foto.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1">
          {/* Main Visualizer Window */}
          <div 
            ref={containerRef}
            onMouseDown={handleMouseDownViewer}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDownViewer}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            className="lg:col-span-7 bg-[#082D05] rounded-3xl overflow-hidden shadow-2xl relative aspect-[4/3] sm:aspect-[1/1] flex items-center justify-center border border-[#8CFF00]/40 select-none cursor-grab active:cursor-grabbing"
          >
            <div 
              className="absolute inset-0 w-full h-full flex items-center justify-center transition-transform duration-75"
              style={{ transform: `translate(${handTransform.x}px, ${handTransform.y}px) scale(${handTransform.scale})` }}
            >
              <img 
                src={imageSrc} 
                alt="Mano modelo"
                className="w-full h-full object-cover opacity-90 pointer-events-none"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#082D05]/50 via-transparent to-transparent pointer-events-none"></div>

              {/* Overlaid Interactive Nails */}
              {!showOriginal && Object.entries(fingers).map(([fingerKey, tr]) => {
                const basePositions: Record<string, { left: string; top: string }> = {
                  thumb: { left: '28%', top: '65%' },
                  index: { left: '38%', top: '38%' },
                  middle: { left: '48%', top: '32%' },
                  ring: { left: '58%', top: '35%' },
                  pinky: { left: '68%', top: '45%' }
                };
                const pos = basePositions[fingerKey] || { left: '50%', top: '50%' };

                return (
                  <div
                    key={fingerKey}
                    onMouseDown={(e) => handleMouseDownNail(e, fingerKey)}
                    onTouchStart={(e: any) => handleMouseDownNail(e, fingerKey)}
                    className={`absolute cursor-grab active:cursor-grabbing transition-transform duration-75 ${
                      selectedFinger === fingerKey ? 'ring-2 ring-[#8CFF00] ring-offset-2 ring-offset-[#082D05] z-20 scale-105' : 'z-10'
                    }`}
                    style={{
                      left: pos.left,
                      top: pos.top,
                      transform: `translate(${tr.x}px, ${tr.y}px) rotate(${tr.rotation}deg) scale(${tr.scale})`
                    }}
                  >
                    <div className={`relative bg-gradient-to-br ${currentStyleObj.bgGradient} shadow-2xl border border-[#8CFF00]/70 ${getShapeStyle(activeShape, activeLength)} flex flex-col items-center justify-start overflow-hidden pointer-events-none`}>
                      <div className="absolute top-0 left-1 right-1 h-1/2 bg-gradient-to-b from-white/70 to-transparent rounded-t-full"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#8CFF00] mt-3 shadow-sm"></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compare Original Mode */}
            {showOriginal && (
              <div className="absolute inset-0 bg-[#082D05]/90 flex flex-col items-center justify-center text-[#F7F8EF] z-30 transition-opacity pointer-events-none">
                <p className="font-display text-xl font-bold text-[#8CFF00]">Mostrando Original sin Uñas</p>
                <p className="text-xs text-[#F7F8EF]/70 mt-1">Suelta para ver el Try-On</p>
              </div>
            )}

            {/* Floating Controls */}
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between z-30">
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-[#F7F8EF]/90 hover:bg-[#F7F8EF] text-[#082D05] text-xs font-bold uppercase tracking-wider rounded-full shadow-lg backdrop-blur-md transition-all flex items-center gap-2"
                >
                  <Upload className="w-4 h-4 text-[#8CFF00]" />
                  <span>Subir Foto Propia</span>
                </button>
              </div>

              <button
                onMouseDown={() => setShowOriginal(true)}
                onMouseUp={() => setShowOriginal(false)}
                onTouchStart={() => setShowOriginal(true)}
                onTouchEnd={() => setShowOriginal(false)}
                className="px-4 py-2.5 bg-[#8CFF00] hover:bg-[#70CC00] text-[#082D05] text-xs font-bold uppercase tracking-wider rounded-full shadow-lg transition-all flex items-center gap-2 select-none"
              >
                <Eye className="w-4 h-4" />
                <span>Ver Original</span>
              </button>
            </div>
          </div>

          {/* Sidebar Controls & Customization */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-[#8CFF00]/25 shadow-sm space-y-6">
            {/* Model Hands Presets Selector */}
            <div>
              <label className="block text-xs font-bold text-[#082D05] uppercase tracking-wider mb-2">Manos Modelo (Prueba Rápida)</label>
              <div className="grid grid-cols-3 gap-2">
                {MODEL_HANDS.map((mImg, idx) => (
                  <button
                    key={idx}
                    onClick={() => setImageSrc(mImg)}
                    className={`aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all ${
                      imageSrc === mImg ? 'ring-2 ring-[#8CFF00] border-[#082D05] scale-105' : 'border-neutral-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={mImg} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 pt-2">
              <button
                onClick={() => setActiveTabPanel('style')}
                className={`text-xs font-bold uppercase tracking-wider pb-2 transition-colors border-b-2 ${
                  activeTabPanel === 'style' ? 'text-[#082D05] border-[#8CFF00]' : 'text-neutral-400 border-transparent'
                }`}
              >
                1. Estilos
              </button>
              <button
                onClick={() => setActiveTabPanel('shape')}
                className={`text-xs font-bold uppercase tracking-wider pb-2 transition-colors border-b-2 ${
                  activeTabPanel === 'shape' ? 'text-[#082D05] border-[#8CFF00]' : 'text-neutral-400 border-transparent'
                }`}
              >
                2. Formas y Longitud
              </button>
              <button
                onClick={() => setActiveTabPanel('calibrate')}
                className={`text-xs font-bold uppercase tracking-wider pb-2 transition-colors border-b-2 ${
                  activeTabPanel === 'calibrate' ? 'text-[#082D05] border-[#8CFF00]' : 'text-neutral-400 border-transparent'
                }`}
              >
                3. Ajustar Uñas
              </button>
            </div>

            {/* Panel 1: Styles */}
            {activeTabPanel === 'style' && (
              <div className="space-y-4">
                <h3 className="font-display font-semibold text-sm text-[#082D05]">Selecciona Estilo de Uña</h3>
                <div className="grid grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1">
                  {stylesToUse.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setActiveStyle(st.id as NailStyleId)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        activeStyle === st.id 
                          ? 'border-[#8CFF00] bg-[#8CFF00]/10 shadow-sm ring-1 ring-[#8CFF00]' 
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${st.bgGradient} border border-[#8CFF00]/50 shadow-sm`}></div>
                        <span className="text-[10px] uppercase font-bold text-[#8CFF00]">{st.badge}</span>
                      </div>
                      <span className="font-display text-xs font-bold text-[#082D05]">{st.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Panel 2: Shapes & Length */}
            {activeTabPanel === 'shape' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display font-semibold text-sm text-[#082D05] mb-3">Forma Ungueal</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'almond', label: 'Almendra' },
                      { id: 'coffin', label: 'Coffin' },
                      { id: 'square', label: 'Cuadrada' },
                      { id: 'oval', label: 'Ovalada' },
                      { id: 'stiletto', label: 'Stiletto' }
                    ].map((sh) => (
                      <button
                        key={sh.id}
                        onClick={() => setActiveShape(sh.id as NailShape)}
                        className={`p-3 text-xs font-semibold rounded-xl border transition-all ${
                          activeShape === sh.id
                            ? 'bg-[#082D05] text-[#F7F8EF] border-[#082D05]'
                            : 'bg-white text-[#082D05] border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        {sh.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-semibold text-sm text-[#082D05] mb-3">Longitud</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'short', label: 'Corta' },
                      { id: 'medium', label: 'Media' },
                      { id: 'long', label: 'Larga' }
                    ].map((len) => (
                      <button
                        key={len.id}
                        onClick={() => setActiveLength(len.id as NailLength)}
                        className={`p-3 text-xs font-semibold rounded-xl border transition-all ${
                          activeLength === len.id
                            ? 'bg-[#8CFF00] text-[#082D05] border-[#8CFF00] font-bold'
                            : 'bg-white text-[#082D05] border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        {len.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Panel 3: Calibration */}
            {activeTabPanel === 'calibrate' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#082D05] mb-2">Selecciona Dedo a Modificar</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'thumb', label: 'Pulgar' },
                        { id: 'index', label: 'Índice' },
                        { id: 'middle', label: 'Medio' },
                        { id: 'ring', label: 'Anular' },
                        { id: 'pinky', label: 'Meñique' }
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setSelectedFinger(f.id)}
                          className={`flex-1 py-2 text-[10px] font-semibold rounded-lg border transition-all ${
                            selectedFinger === f.id
                              ? 'bg-[#082D05] text-[#F7F8EF] border-[#082D05]'
                              : 'bg-neutral-50 text-[#082D05] border-neutral-200'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 text-xs pt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#082D05]">Mover Posición (X / Y)</span>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleTransformChange('x', -5)} className="px-2 py-1 bg-neutral-100 rounded">?</button>
                        <button onClick={() => handleTransformChange('x', 5)} className="px-2 py-1 bg-neutral-100 rounded">→</button>
                        <button onClick={() => handleTransformChange('y', -5)} className="px-2 py-1 bg-neutral-100 rounded">↑</button>
                        <button onClick={() => handleTransformChange('y', 5)} className="px-2 py-1 bg-neutral-100 rounded">↓</button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#082D05]">Rotación de ángulo</span>
                      <div className="flex gap-2">
                        <button onClick={() => handleTransformChange('rotation', -5)} className="px-3 py-1 bg-neutral-100 rounded">-5°</button>
                        <button onClick={() => handleTransformChange('rotation', 5)} className="px-3 py-1 bg-neutral-100 rounded">+5°</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={resetAll}
                    className="w-full py-2.5 border border-neutral-300 text-[#082D05] text-xs font-semibold rounded-xl hover:bg-neutral-50 flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restablecer Posiciones</span>
                  </button>
                </div>
              </div>
            )}

            {/* CTA Transfer to Booking */}
            <div className="pt-4 border-t border-neutral-100">
              <button
                onClick={() => setActiveTab('booking')}
                className="w-full py-4 bg-[#8CFF00] hover:bg-[#70CC00] text-[#082D05] font-bold text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Reservar este Look ({currentStyleObj.name})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

