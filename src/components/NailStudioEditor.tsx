import React, { useState, useRef, useEffect } from 'react';
import {
  Palette, RotateCcw, Send, Sparkles, Camera, ArrowRight
} from 'lucide-react';
import { NailShape, CustomDesign, NailCatalogStyle } from '../types';

interface NailStudioEditorProps {
  onSaveDesign: (design: CustomDesign) => void;
  setActiveTab: (tab: string) => void;
  catalogStyles?: NailCatalogStyle[];
}

const SHAPES: { id: NailShape; label: string }[] = [
  { id: 'almond', label: 'Almendra' },
  { id: 'oval', label: 'Ovalada' },
  { id: 'square', label: 'Cuadrada' },
  { id: 'coffin', label: 'Coffin' },
  { id: 'stiletto', label: 'Stiletto' }
];

const PALETTE = [
  '#082D05', '#8CFF00', '#F7F8EF', '#2B0C15', '#121212',
  '#FFD1DC', '#D4AF37', '#957DAD', '#E0BBE4', '#333333'
];

export const NailStudioEditor: React.FC<NailStudioEditorProps> = ({ onSaveDesign, setActiveTab }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [designerColor, setDesignerColor] = useState<string>('#082D05');
  const [designerFinish, setDesignerFinish] = useState<string>('glossy');
  const [designerShape, setDesignerShape] = useState<NailShape>('almond');
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [designCode, setDesignCode] = useState<string>(`LGN-${Math.floor(1000 + Math.random() * 9000)}`);

  useEffect(() => {
    redrawDesignerCanvas();
  }, [designerColor, designerFinish, designerShape]);

  const redrawDesignerCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 550;

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#082D05');
    grad.addColorStop(1, '#176B00');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.fillStyle = designerColor;
    ctx.strokeStyle = '#8CFF00';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(197, 160, 89, 0.5)';
    ctx.shadowBlur = 20;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 10;
    const w = 150;
    const h = 340;

    ctx.beginPath();
    if (designerShape === 'almond') {
      ctx.moveTo(cx - w/2, cy + h/2);
      ctx.lineTo(cx - w/2, cy - h/4);
      ctx.quadraticCurveTo(cx - w/2, cy - h/2, cx, cy - h/2 - 40);
      ctx.quadraticCurveTo(cx + w/2, cy - h/2, cx + w/2, cy - h/4);
      ctx.lineTo(cx + w/2, cy + h/2);
    } else if (designerShape === 'coffin') {
      ctx.moveTo(cx - w/2, cy + h/2);
      ctx.lineTo(cx - w/2, cy - h/3);
      ctx.lineTo(cx - w/3, cy - h/2 - 20);
      ctx.lineTo(cx + w/3, cy - h/2 - 20);
      ctx.lineTo(cx + w/2, cy - h/3);
      ctx.lineTo(cx + w/2, cy + h/2);
    } else if (designerShape === 'square') {
      ctx.rect(cx - w/2, cy - h/2 - 10, w, h);
    } else if (designerShape === 'stiletto') {
      ctx.moveTo(cx - w/2, cy + h/2);
      ctx.lineTo(cx - w/2, cy - h/4);
      ctx.lineTo(cx, cy - h/2 - 70);
      ctx.lineTo(cx + w/2, cy - h/4);
      ctx.lineTo(cx + w/2, cy + h/2);
    } else {
      ctx.moveTo(cx - w/2, cy + h/2);
      ctx.lineTo(cx - w/2, cy - h/3);
      ctx.quadraticCurveTo(cx - w/2, cy - h/2 - 20, cx, cy - h/2 - 20);
      ctx.quadraticCurveTo(cx + w/2, cy - h/2 - 20, cx + w/2, cy - h/3);
      ctx.lineTo(cx + w/2, cy + h/2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (designerFinish === 'glossy') {
      const gloss = ctx.createLinearGradient(cx - w/2, cy - h/2, cx + w/2, cy);
      gloss.addColorStop(0, 'rgba(255,255,255,0.5)');
      gloss.addColorStop(0.5, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = gloss;
      ctx.fill();
    }
    ctx.restore();
  };

  const resetDesign = () => {
    setDesignerColor('#082D05');
    setDesignerFinish('glossy');
    setDesignerShape('almond');
  };

  const handleSaveDesignerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone) {
      alert('Por favor ingresa tu nombre y teléfono para guardar el diseño.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageBase64 = canvas.toDataURL('image/png');

    const newDesign: CustomDesign = {
      id: Date.now().toString(),
      code: designCode,
      imageBase64,
      clientName,
      clientPhone,
      notes: `Forma: ${designerShape} | Color Base: ${designerColor} | Acabado: ${designerFinish}`,
      shape: designerShape,
      baseColor: designerColor,
      status: 'Pendiente',
      createdAt: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    };

    onSaveDesign(newDesign);
    alert(`¡Diseño ${designCode} guardado y enviado a la cabina del salón con éxito!`);
    setActiveTab('mybookings');
  };

  return (
    <div className="min-h-screen bg-[#F7F8EF] pb-24 lg:pb-12 px-4 lg:px-8 py-6 flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 border-b border-[#8CFF00]/25 pb-4">
          <div>
            <span className="px-3 py-1 bg-[#8CFF00]/20 text-[#8CFF00] text-[10px] font-bold uppercase tracking-widest rounded-full">
              Diseño personalizado
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#082D05] mt-1">
              Crea Tu Propio Diseño
            </h1>
            <p className="text-xs text-neutral-600 mt-1 max-w-md">
              Elige forma, color y acabado en el lienzo interactivo y envíalo directamente a la cabina del salón.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('tryon')}
            className="px-4 py-2.5 bg-white border border-neutral-300 hover:border-[#8CFF00] text-[#082D05] text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-sm transition-all shrink-0"
          >
            <Camera className="w-4 h-4 text-[#8CFF00]" />
            <span>Ver Estilos en el Simulador</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1">
          {/* Canvas Workbench */}
          <div className="lg:col-span-7 bg-[#082D05] p-6 rounded-3xl shadow-2xl flex flex-col items-center border border-[#8CFF00]/30 relative">
            <div className="absolute top-4 left-6 flex items-center gap-2 text-xs font-semibold text-[#8CFF00]">
              <Palette className="w-4 h-4" />
              <span>Lienzo Táctil de Precisión</span>
            </div>

            <div className="my-4 relative rounded-2xl overflow-hidden shadow-2xl border-2 border-[#8CFF00]/40 bg-black">
              <canvas ref={canvasRef} className="block max-w-full h-auto" />
            </div>

            {/* Quick Color Palette */}
            <div className="w-full flex items-center justify-center flex-wrap gap-3 bg-[#176B00] p-4 rounded-2xl border border-[#8CFF00]/20">
              {PALETTE.map(col => (
                <button
                  key={col}
                  onClick={() => setDesignerColor(col)}
                  aria-label={`Color ${col}`}
                  className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${
                    designerColor === col ? 'ring-2 ring-[#8CFF00] ring-offset-2 ring-offset-[#176B00] border-white' : 'border-neutral-500'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>

          {/* Designer Form & Shape Sidebar */}
          <form onSubmit={handleSaveDesignerSubmit} className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-[#8CFF00]/25 shadow-sm space-y-6">
            <div>
              <h3 className="font-display text-lg font-bold text-[#082D05] mb-3">Forma de Uña</h3>
              <div className="grid grid-cols-3 gap-2">
                {SHAPES.map(sh => (
                  <button
                    type="button"
                    key={sh.id}
                    onClick={() => setDesignerShape(sh.id)}
                    className={`py-2 px-1 text-xs font-semibold rounded-xl border transition-all ${
                      designerShape === sh.id ? 'bg-[#082D05] text-[#F7F8EF] border-[#082D05]' : 'bg-neutral-50 text-[#082D05] border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    {sh.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-display text-lg font-bold text-[#082D05] mb-3">Acabado</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'glossy', label: 'Brillo Vítreo' },
                  { id: 'matte', label: 'Mate Terciopelo' }
                ].map(fn => (
                  <button
                    type="button"
                    key={fn.id}
                    onClick={() => setDesignerFinish(fn.id)}
                    className={`py-2.5 px-2 text-xs font-semibold rounded-xl border transition-all ${
                      designerFinish === fn.id ? 'bg-[#8CFF00] text-[#082D05] border-[#8CFF00] font-bold' : 'bg-neutral-50 text-[#082D05] border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    {fn.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={resetDesign}
              className="w-full py-2 border border-neutral-300 text-[#082D05] text-xs font-semibold rounded-xl hover:bg-neutral-50 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer Diseño</span>
            </button>

            <div className="space-y-4 pt-4 border-t border-neutral-100">
              <h3 className="font-display text-base font-bold text-[#082D05] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#8CFF00]" />
                <span>Enviar a Cabina de Salón</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-[#082D05] mb-1">Tu Nombre y Apellido *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej. Sofía Laurent"
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#8CFF00] focus:outline-none"
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
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#8CFF00] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-[#082D05] hover:bg-[#176B00] text-[#F7F8EF] text-xs font-bold uppercase tracking-widest rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4 text-[#8CFF00]" />
                <span>Guardar Diseño ({designCode})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('booking')}
                className="w-full py-3 bg-[#8CFF00]/10 hover:bg-[#8CFF00]/20 text-[#082D05] text-xs font-bold uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <span>Reservar Cita Directamente</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

