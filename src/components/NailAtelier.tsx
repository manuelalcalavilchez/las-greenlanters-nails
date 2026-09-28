import React, { useState, useRef, useEffect } from 'react';
import { Palette, Undo2, Eraser, Brush, Sparkles, Send, CheckCircle2, CircleDot, Gem, Download } from 'lucide-react';
import { CustomDesign } from '../types';

interface NailAtelierProps {
  onSaveDesign: (design: CustomDesign) => void;
}

export const NailAtelier: React.FC<NailAtelierProps> = ({ onSaveDesign }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'liner' | 'brush' | 'dot' | 'eraser' | 'stamp'>('liner');
  const [brushSize, setBrushSize] = useState<number>(4);
  const [color, setColor] = useState<string>('#8CFF00');
  const [baseColor, setBaseColor] = useState<string>('#F7F8EF');
  const [nailShape, setNailShape] = useState<'almond' | 'coffin' | 'square' | 'stiletto'>('almond');
  const [stampType, setStampType] = useState<'swarovski' | 'gold_leaf' | 'flower'>('swarovski');
  
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [designNotes, setDesignNotes] = useState('');
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  // Initialize canvas background and nail contour
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = 400;
    canvas.height = 550;

    redrawCanvas();
  }, [baseColor, nailShape]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw workbench wood/marble texture base
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#082D05');
    grad.addColorStop(1, '#176B00');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Nail Silhouette
    ctx.save();
    ctx.fillStyle = baseColor;
    ctx.strokeStyle = '#8CFF00';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(197, 160, 89, 0.4)';
    ctx.shadowBlur = 15;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 10;
    const w = 140;
    const h = 320;

    ctx.beginPath();
    if (nailShape === 'almond') {
      ctx.moveTo(cx - w/2, cy + h/2);
      ctx.lineTo(cx - w/2, cy - h/4);
      ctx.quadraticCurveTo(cx - w/2, cy - h/2, cx, cy - h/2 - 40);
      ctx.quadraticCurveTo(cx + w/2, cy - h/2, cx + w/2, cy - h/4);
      ctx.lineTo(cx + w/2, cy + h/2);
      ctx.closePath();
    } else if (nailShape === 'coffin') {
      ctx.moveTo(cx - w/2, cy + h/2);
      ctx.lineTo(cx - w/2, cy - h/3);
      ctx.lineTo(cx - w/3, cy - h/2 - 20);
      ctx.lineTo(cx + w/3, cy - h/2 - 20);
      ctx.lineTo(cx + w/2, cy - h/3);
      ctx.lineTo(cx + w/2, cy + h/2);
      ctx.closePath();
    } else if (nailShape === 'square') {
      ctx.rect(cx - w/2, cy - h/2 - 10, w, h);
    } else { // stiletto
      ctx.moveTo(cx - w/2, cy + h/2);
      ctx.lineTo(cx - w/2, cy - h/4);
      ctx.lineTo(cx, cy - h/2 - 60);
      ctx.lineTo(cx + w/2, cy - h/4);
      ctx.lineTo(cx + w/2, cy + h/2);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Save initial state to undo stack
    const initialImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (undoStack.length === 0) {
      setUndoStack([initialImg]);
    }
  };

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack(prev => [...prev.slice(-15), imgData]);
  };

  const handleUndo = () => {
    if (undoStack.length <= 1) return;
    const newStack = [...undoStack];
    newStack.pop(); // remove current
    const previousState = newStack[newStack.length - 1];
    setUndoStack(newStack);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(previousState, 0, 0);
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    if (tool === 'stamp') {
      saveCanvasState();
      ctx.save();
      ctx.beginPath();
      if (stampType === 'swarovski') {
        ctx.fillStyle = '#E5C57E';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (stampType === 'gold_leaf') {
        ctx.fillStyle = '#D4AF37';
        ctx.fillRect(x - 10, y - 6, 20, 12);
      } else {
        // flower
        ctx.fillStyle = '#ffb6c1';
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5;
          ctx.beginPath();
          ctx.arc(x + Math.cos(angle) * 8, y + Math.sin(angle) * 8, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#8CFF00';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    setIsDrawing(true);
    saveCanvasState();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = tool === 'eraser' ? baseColor : color;
    ctx.lineWidth = tool === 'liner' ? 2 : tool === 'dot' ? 12 : brushSize;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone) {
      alert('Por favor ingresa tu nombre y número de WhatsApp.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageBase64 = canvas.toDataURL('image/png');
    const randomCode = `DSN-${Math.floor(1000 + Math.random() * 9000)}`;

    const newDesign: CustomDesign = {
      id: Date.now().toString(),
      code: randomCode,
      imageBase64,
      clientName,
      clientPhone,
      notes: designNotes || 'Sin notas adicionales',
      shape: nailShape,
      baseColor,
      status: 'Pendiente',
      createdAt: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    };

    onSaveDesign(newDesign);
    setSubmittedCode(randomCode);
  };

  return (
    <div className="min-h-screen bg-[#F7F8EF] pb-24 lg:pb-12 px-4 lg:px-12 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8CFF00]">Atelier Profesional</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#082D05] mt-2">
            Diseña tu Nail Art Personalizado
          </h1>
          <p className="text-sm text-[#082D05]/70 mt-2">
            Dibuja directamente sobre la uña virtual con pinceladas precisas, añade cristales Swarovski y envíalo a nuestra cabina.
          </p>
        </div>

        {submittedCode ? (
          <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl border border-[#8CFF00]/30 text-center space-y-6 shadow-xl">
            <div className="w-16 h-16 bg-[#082D05] text-[#8CFF00] rounded-full flex items-center justify-center mx-auto text-2xl shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          <h2 className="font-display text-2xl font-bold text-[#082D05]">¡Diseño Enviado con Éxito!</h2>
            <p className="text-xs text-[#082D05]/70">
              Hemos registrado tu boceto en nuestro sistema de cabina bajo el código exclusivo:
            </p>
            <div className="p-4 bg-[#F7F8EF] rounded-xl border border-[#8CFF00]/40 font-mono text-xl font-bold text-[#082D05]">
              {submittedCode}
            </div>
            <p className="text-xs text-[#082D05]/70">
          Nuestra master nail artist lo tendrá listo en cabina para tu próxima visita. También puedes citarlo por WhatsApp.
            </p>
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setSubmittedCode(null)}
                className="flex-1 py-3 bg-[#082D05] text-[#F7F8EF] text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-[#176B00]"
              >
            Diseñar Otro
              </button>
              <a
              href=`https://wa.me/34690123456?text=Hola,%20he%20creado%20el%20diseño%20personalizado%20con%20código%20\${submittedCode}.%20Me%20gustaría%20reservar%20cita.`
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 bg-[#8CFF00] text-[#082D05] text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-[#70CC00] flex items-center justify-center gap-2"
              >
                <span>Enviar a WhatsApp</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Canvas Workbench */}
            <div className="lg:col-span-7 bg-[#082D05] p-6 rounded-3xl shadow-2xl flex flex-col items-center border border-[#8CFF00]/30 relative">
              <div className="absolute top-4 left-6 flex items-center gap-2 text-xs font-semibold text-[#8CFF00]">
                <Sparkles className="w-4 h-4" />
                <span>Lienzo Táctil Interactivo</span>
              </div>

              <div className="my-4 relative rounded-2xl overflow-hidden shadow-2xl border-2 border-[#8CFF00]/40 bg-black">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="cursor-crosshair touch-none block"
                />
              </div>

              {/* Toolbar */}
              <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-[#176B00] p-4 rounded-2xl border border-[#8CFF00]/20">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTool('liner')}
                    className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold ${
                      tool === 'liner' ? 'bg-[#8CFF00] text-[#082D05]' : 'bg-[#082D05] text-[#F7F8EF]'
                    }`}
                    title="Liner Fino"
                  >
                    <Brush className="w-4 h-4" />
                    <span className="hidden sm:inline">Liner</span>
                  </button>

                  <button
                    onClick={() => setTool('dot')}
                    className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold ${
                      tool === 'dot' ? 'bg-[#8CFF00] text-[#082D05]' : 'bg-[#082D05] text-[#F7F8EF]'
                    }`}
                    title="Dotting Tool"
                  >
                    <CircleDot className="w-4 h-4" />
                    <span className="hidden sm:inline">Dot</span>
                  </button>

                  <button
                    onClick={() => setTool('stamp')}
                    className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold ${
                      tool === 'stamp' ? 'bg-[#8CFF00] text-[#082D05]' : 'bg-[#082D05] text-[#F7F8EF]'
                    }`}
                    title="Estampas & Gemas"
                  >
                    <Gem className="w-4 h-4" />
                    <span className="hidden sm:inline">Gemas</span>
                  </button>

                  <button
                    onClick={() => setTool('eraser')}
                    className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold ${
                      tool === 'eraser' ? 'bg-[#8CFF00] text-[#082D05]' : 'bg-[#082D05] text-[#F7F8EF]'
                    }`}
                    title="Borrador"
                  >
                    <Eraser className="w-4 h-4" />
                    <span className="hidden sm:inline">Borrador</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleUndo}
                    className="p-2.5 bg-[#082D05] text-[#F7F8EF] rounded-xl hover:bg-[#8CFF00] hover:text-[#082D05] transition-all"
                    title="Deshacer"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>

                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-9 h-9 rounded-xl border border-[#8CFF00]/50 bg-transparent cursor-pointer"
                    title="Selector de Color"
                  />
                </div>
              </div>
            </div>

            {/* Shape, Base Color & Submission Form */}
            <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-[#8CFF00]/25 shadow-sm space-y-6">
              <div>
                <h3 className="font-display text-lg font-bold text-[#082D05] mb-3">Configuración Base</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#082D05] mb-2">Forma de Uña</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'almond', label: 'Almendra' },
                        { id: 'coffin', label: 'Coffin' },
                        { id: 'square', label: 'Cuadrada' },
                        { id: 'stiletto', label: 'Stiletto' }
                      ].map((sh) => (
                        <button
                          key={sh.id}
                          onClick={() => setNailShape(sh.id as any)}
                          className={`py-2 px-1 text-[11px] font-semibold rounded-lg border transition-all truncate ${
                            nailShape === sh.id ? 'bg-[#082D05] text-[#F7F8EF] border-[#082D05]' : 'bg-neutral-50 text-[#082D05] border-neutral-200'
                          }`}
                        >
                          {sh.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#082D05] mb-2">Tono Base de Esmalte</label>
                    <div className="flex gap-3">
                      {[
                        { color: '#F7F8EF', name: 'Lechoso' },
                        { color: '#f3e5db', name: 'Nude' },
                        { color: '#082D05', name: 'Esmeralda' },
                        { color: '#2b0c15', name: 'Borgoña' },
                        { color: '#121212', name: 'Negro' }
                      ].map((col) => (
                        <button
                          key={col.color}
                          onClick={() => setBaseColor(col.color)}
                          className={`w-9 h-9 rounded-full border-2 transition-all shadow-sm ${
                            baseColor === col.color ? 'ring-2 ring-[#8CFF00] ring-offset-2 border-[#082D05]' : 'border-neutral-300'
                          }`}
                          style={{ backgroundColor: col.color }}
                          title={col.name}
                        />
                      ))}
                    </div>
                  </div>

                  {tool === 'stamp' && (
                    <div>
                      <label className="block text-xs font-semibold text-[#082D05] mb-2">Tipo de Estampa / Gema</label>
                      <div className="flex gap-2">
                        {[
                          { id: 'swarovski', label: 'Cristal Swarovski' },
                          { id: 'gold_leaf', label: 'Pan de Oro' },
                          { id: 'flower', label: 'Flor Botánica' }
                        ].map((st) => (
                          <button
                            key={st.id}
                            onClick={() => setStampType(st.id as any)}
                            className={`flex-1 py-2 px-1 text-[10px] font-semibold rounded-lg border transition-all ${
                              stampType === st.id ? 'bg-[#8CFF00] text-[#082D05] border-[#8CFF00]' : 'bg-neutral-50 text-[#082D05] border-neutral-200'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form to submit */}
              <form onSubmit={handleFinalSubmit} className="space-y-4 pt-4 border-t border-neutral-100">
                <h3 className="font-display text-base font-bold text-[#082D05]">Enviar a Cabina de Salón</h3>
                
                <div>
                  <label className="block text-xs font-semibold text-[#082D05] mb-1">Tu Nombre y Apellido *</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                placeholder="Ej. Lucía Martínez"
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

                <div>
                  <label className="block text-xs font-semibold text-[#082D05] mb-1">Notas para la Manicurista</label>
                  <textarea
                    rows={2}
                    value={designNotes}
                    onChange={(e) => setDesignNotes(e.target.value)}
                    placeholder="Ej. Uña para mano izquierda, efecto brillante..."
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#8CFF00] focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-[#082D05] hover:bg-[#176B00] text-[#F7F8EF] text-xs font-bold uppercase tracking-widest rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4 text-[#8CFF00]" />
                  <span>Guardar y Enviar al Salón</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

