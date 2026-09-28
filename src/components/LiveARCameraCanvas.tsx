import React, { useState, useRef, useEffect } from 'react';
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { Camera, Video, VideoOff, Sparkles, RotateCcw, Check, RefreshCw, Save, AlertCircle, Upload, ShieldAlert, Activity } from 'lucide-react';
import { NailShape, NailLength, CustomDesign, NailCatalogStyle } from '../types';
import { NAIL_STYLES_CATALOG } from '../data/mockData';

interface LiveARCameraCanvasProps {
  onSaveDesign: (design: CustomDesign) => void;
  setActiveTab: (tab: string) => void;
  catalogStyles?: NailCatalogStyle[];
}

export const LiveARCameraCanvas: React.FC<LiveARCameraCanvasProps> = ({ onSaveDesign, setActiveTab, catalogStyles }) => {
  const stylesToUse = catalogStyles && catalogStyles.length > 0 ? catalogStyles : NAIL_STYLES_CATALOG;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const detectionReadyRef = useRef(false);

  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [useFallbackMode, setUseFallbackMode] = useState<boolean>(false);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [activeStyle, setActiveStyle] = useState<string>('emerald_gold');
  const [activeShape, setActiveShape] = useState<NailShape>('almond');
  const [activeLength, setActiveLength] = useState<NailLength>('medium');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('Iniciando sistema AR...');

  // Finger positions on canvas (percentages 0-100)
  const [fingers, setFingers] = useState<Record<string, { x: number; y: number; rotation: number; scale: number }>>({
    thumb: { x: 35, y: 70, rotation: -25, scale: 1 },
    index: { x: 45, y: 45, rotation: -8, scale: 1 },
    middle: { x: 55, y: 40, rotation: 0, scale: 1.05 },
    ring: { x: 65, y: 43, rotation: 10, scale: 1 },
    pinky: { x: 75, y: 52, rotation: 22, scale: 0.9 }
  });

  const [selectedFinger, setSelectedFinger] = useState<string>('index');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Real hand tracking: MediaPipe Hand Landmarker (21 landmarks per hand).
  useEffect(() => {
    let cancelled = false;
    const initHandLandmarker = async () => {
      try {
        setStatusText('Cargando detector de manos...');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.5
        });
        if (!cancelled) {
          handLandmarkerRef.current = landmarker;
          detectionReadyRef.current = true;
          setStatusText('Detector de manos listo · esperando cámara');
        } else {
          landmarker.close();
        }
      } catch (error) {
        console.error('[AR Hand Tracking] No se pudo inicializar MediaPipe:', error);
        detectionReadyRef.current = false;
        setErrorMessage('No se pudo cargar el detector de manos. Se mantiene el modo AR interactivo.');
        setStatusText('Detector de manos no disponible');
      }
    };
    initHandLandmarker();
    return () => {
      cancelled = true;
      handLandmarkerRef.current?.close();
      handLandmarkerRef.current = null;
      detectionReadyRef.current = false;
    };
  }, []);

  const updateFingersFromHands = (result: HandLandmarkerResult) => {
    if (!result.landmarks?.length) return false;

    const next: Record<string, { x: number; y: number; rotation: number; scale: number }> = {};
    const fingerDefinitions = [
      { name: 'thumb', tip: 4, base: 2 },
      { name: 'index', tip: 8, base: 5 },
      { name: 'middle', tip: 12, base: 9 },
      { name: 'ring', tip: 16, base: 13 },
      { name: 'pinky', tip: 20, base: 17 }
    ];

    // Use the first detected hand for the nail overlay. The tracker is configured
    // for two hands so detection remains robust when a second hand enters frame.
    const landmarks = result.landmarks[0];
    for (const finger of fingerDefinitions) {
      const tip = landmarks[finger.tip];
      const base = landmarks[finger.base];
      const x = (1 - tip.x) * 100;
      const y = tip.y * 100;
      const dx = tip.x - base.x;
      const dy = tip.y - base.y;
      const rotation = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      const distance = Math.hypot(dx, dy);
      const scale = Math.max(0.55, Math.min(1.8, distance * 8.5));
      next[finger.name] = { x, y, rotation, scale };
    }

    setFingers(next);
    return true;
  };

  const startCamera = async () => {
    console.log('[AR Lifecycle] Requesting MediaStream initialization...');
    setErrorMessage(null);
    setUseFallbackMode(false);
    setCustomImage(null);
    setStatusText('Verificando permisos de cámara...');

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setUseFallbackMode(true);
      setIsStreaming(true);
      setErrorMessage('La cámara del navegador requiere HTTPS. En una IP local HTTP se mantiene el modo AR interactivo.');
      setStatusText('HTTPS necesario para usar la cámara');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('[AR Lifecycle] navigator.mediaDevices.getUserMedia not supported. Using AR Simulation.');
      setUseFallbackMode(true);
      setIsStreaming(true);
      setErrorMessage('La API MediaDevices no está disponible en este entorno.');
      setStatusText('Modo AR Interactivo activo');
      return;
    }

    try {
      console.log('[AR Lifecycle] Calling navigator.mediaDevices.getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      console.log('[AR Lifecycle] MediaStream acquired successfully:', stream);
      
      stream.getTracks().forEach(track => {
        console.log(`[AR Lifecycle] Track active: ${track.kind} (${track.label})`, track.getSettings());
        track.onended = () => {
          console.warn('[AR Lifecycle] MediaStream track ended unexpectedly.');
          setStatusText('Cámara desconectada');
        };
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        console.log('[AR Lifecycle] Video element playing live stream.');
        setIsStreaming(true);
        setStatusText('Cámara activa en tiempo real');
      }
    } catch (err: any) {
      // Gracefully handle NotAllowedError / PermissionDeniedError without unhandled rejection noise
      console.warn('[AR Lifecycle Notice] getUserMedia restricted or denied:', err.name, err.message);
      setUseFallbackMode(true);
      setIsStreaming(true);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Cámara bloqueada: Permiso denegado. Se ha activado el Modo AR Interactivo de forma automática.');
        setStatusText('Cámara bloqueada (Modo AR Interactivo)');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No se encontró cámara. Usando Modo AR Interactivo.');
        setStatusText('Sin cámara física (Modo AR Interactivo)');
      } else {
        setErrorMessage('Entorno de previsualización protegido (Iframe). Modo AR Interactivo activo.');
        setStatusText('Modo AR Interactivo activo');
      }
    }
  };

  const stopCamera = () => {
    console.log('[AR Lifecycle] Stopping active MediaStream...');
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log(`[AR Lifecycle] Stopped track: ${track.kind}`);
      });
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setStatusText('Cámara detenida');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    stopCamera();
    const file = e.target.files?.[0];
    if (file) {
      console.log('[AR Lifecycle] Custom hand image uploaded:', file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCustomImage(event.target.result as string);
          setUseFallbackMode(false);
          setIsStreaming(true);
          setErrorMessage(null);
          setStatusText('Imagen de mano personalizada activa');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Real-time render loop on HTML5 Canvas using requestAnimationFrame
  useEffect(() => {
    let animationId: number;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const renderFrame = () => {
      if (canvas && isStreaming) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = 800;
          canvas.height = 600;

          if (!customImage && !useFallbackMode && detectionReadyRef.current && handLandmarkerRef.current && video && video.readyState >= video.HAVE_CURRENT_DATA && video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;
            try {
              const result = handLandmarkerRef.current.detectForVideo(video, performance.now());
              updateFingersFromHands(result);
            } catch (error) {
              console.warn('[AR Hand Tracking] Frame detection failed:', error);
            }
          }

          if (customImage) {
            const img = new Image();
            img.src = customImage;
            if (img.complete) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            } else {
              img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
          } else if (!useFallbackMode && video && video.readyState === video.HAVE_ENOUGH_DATA) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          } else {
            const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            bgGrad.addColorStop(0, '#176B00');
            bgGrad.addColorStop(1, '#082D05');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#43B800';
            ctx.beginPath();
            ctx.ellipse(canvas.width / 2, canvas.height / 2 + 50, 180, 220, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(140, 255, 0, 0.18)';
            ctx.lineWidth = 1;
            for (let i = 0; i < canvas.width; i += 40) {
              ctx.beginPath();
              ctx.moveTo(i, 0);
              ctx.lineTo(i, canvas.height);
              ctx.stroke();
            }
          }

          // Draw augmented reality nail overlays
          const styleObj = stylesToUse.find(s => s.id === activeStyle) || stylesToUse[0];
          
          Object.entries(fingers).forEach(([fingerKey, f]) => {
            ctx.save();
            const posX = (f.x / 100) * canvas.width;
            const posY = (f.y / 100) * canvas.height;

            ctx.translate(posX, posY);
            ctx.rotate((f.rotation * Math.PI) / 180);
            ctx.scale(f.scale, f.scale);

            const w = 38;
            const h = activeLength === 'short' ? 55 : activeLength === 'long' ? 80 : 68;

            ctx.beginPath();
            if (activeShape === 'almond') {
              ctx.moveTo(-w/2, h/2);
              ctx.lineTo(-w/2, -h/4);
              ctx.quadraticCurveTo(-w/2, -h/2, 0, -h/2 - 15);
              ctx.quadraticCurveTo(w/2, -h/2, w/2, -h/4);
              ctx.lineTo(w/2, h/2);
            } else if (activeShape === 'coffin') {
              ctx.moveTo(-w/2, h/2);
              ctx.lineTo(-w/2, -h/3);
              ctx.lineTo(-w/4, -h/2 - 10);
              ctx.lineTo(w/4, -h/2 - 10);
              ctx.lineTo(w/2, -h/3);
              ctx.lineTo(w/2, h/2);
            } else if (activeShape === 'square') {
              ctx.rect(-w/2, -h/2, w, h);
            } else {
              ctx.moveTo(-w/2, h/2);
              ctx.lineTo(-w/2, -h/4);
              ctx.lineTo(0, -h/2 - 25);
              ctx.lineTo(w/2, -h/4);
              ctx.lineTo(w/2, h/2);
            }
            ctx.closePath();

            const nailGrad = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
            if (styleObj.id.includes('emerald')) {
              nailGrad.addColorStop(0, '#082D05');
              nailGrad.addColorStop(1, '#164E3B');
            } else if (styleObj.id.includes('glazed')) {
              nailGrad.addColorStop(0, '#F7F8EF');
              nailGrad.addColorStop(1, '#e5dfd3');
            } else {
              nailGrad.addColorStop(0, '#176B00');
              nailGrad.addColorStop(1, '#8CFF00');
            }
            ctx.fillStyle = nailGrad;
            ctx.fill();

            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#8CFF00';
            ctx.stroke();

            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.fillRect(-w/3, -h/2 + 4, w/1.5, h/3);

            if (selectedFinger === fingerKey) {
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 3;
              ctx.strokeRect(-w/2 - 5, -h/2 - 5, w + 10, h + 10);
            }

            ctx.restore();
          });
        }
      }
      animationId = requestAnimationFrame(renderFrame);
    };

    if (isStreaming) {
      animationId = requestAnimationFrame(renderFrame);
    }

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isStreaming, useFallbackMode, customImage, activeStyle, activeShape, activeLength, fingers, selectedFinger, stylesToUse]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    let closest = selectedFinger;
    let minDist = 999;
    Object.entries(fingers).forEach(([fKey, pos]) => {
      const dist = Math.hypot(pos.x - x, pos.y - y);
      if (dist < minDist) {
        minDist = dist;
        closest = fKey;
      }
    });

    setSelectedFinger(closest);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const dx = ((e.clientX - dragStart.x) / canvas.clientWidth) * 100;
    const dy = ((e.clientY - dragStart.y) / canvas.clientHeight) * 100;

    setFingers(prev => ({
      ...prev,
      [selectedFinger]: {
        ...prev[selectedFinger],
        x: prev[selectedFinger].x + dx,
        y: prev[selectedFinger].y + dy
      }
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const captureAndSaveDesign = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageBase64 = canvas.toDataURL('image/png');
    const code = `AR-${Math.floor(1000 + Math.random() * 9000)}`;

    const newDesign: CustomDesign = {
      id: Date.now().toString(),
      code,
      imageBase64,
      clientName: 'Cliente AR Live',
      clientPhone: '',
      notes: `Captura Realidad Aumentada | Estilo: ${activeStyle}`,
      shape: activeShape,
      baseColor: '#082D05',
      status: 'Pendiente',
      createdAt: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    };

    onSaveDesign(newDesign);
    alert(`Captura AR guardada con éxito (${code}) y enviada a la cabina del salón.`);
    setActiveTab('mybookings');
  };

  return (
    <div className="min-h-screen bg-[#F7F8EF] pb-24 lg:pb-12 px-4 lg:px-8 py-6 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 border-b border-[#8CFF00]/25 pb-4">
          <div>
            <span className="px-3 py-1 bg-[#8CFF00]/20 text-[#8CFF00] text-[10px] font-bold uppercase tracking-widest rounded-full">
              MediaDevices AR Lifecycle Engine
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#082D05] mt-1">
              Simulador de Realidad Aumentada en Vivo
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-[#082D05] text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-sm transition-all"
            >
              <Upload className="w-4 h-4 text-[#8CFF00]" />
              <span>Subir Foto</span>
            </button>

            <button
              onClick={startCamera}
              className="px-4 py-2.5 bg-[#082D05] hover:bg-[#176B00] text-[#F7F8EF] text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-md transition-all"
            >
              <Video className="w-4 h-4 text-[#8CFF00]" />
              <span>Reintentar Cámara</span>
            </button>
            
            <button
              onClick={captureAndSaveDesign}
              className="px-5 py-2.5 bg-[#8CFF00] hover:bg-[#70CC00] text-[#082D05] text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Capturar & Guardar</span>
            </button>
          </div>
        </div>

        {/* Visual Status Indicator Banner */}
        <div className={`p-4 rounded-2xl mb-6 flex items-center justify-between border shadow-sm ${
          errorMessage ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex items-center gap-3">
            {errorMessage ? (
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <Activity className="w-5 h-5 text-emerald-600 shrink-0 animate-pulse" />
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Estado del Sistema AR</p>
              <p className="text-sm font-semibold">{statusText}</p>
              {errorMessage && <p className="text-xs mt-0.5 opacity-90">{errorMessage}</p>}
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase px-2.5 py-1 bg-white/80 rounded-full border">
            {customImage ? 'Fuente: Imagen Subida' : useFallbackMode ? 'Fuente: AR Interactivo' : 'Fuente: Webcam'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1">
          {/* HTML5 Canvas AR Viewport */}
          <div className="lg:col-span-8 bg-[#082D05] rounded-3xl overflow-hidden shadow-2xl relative aspect-[4/3] sm:aspect-[16/9] flex items-center justify-center border border-[#8CFF00]/40">
            <video ref={videoRef} playsInline muted autoPlay className="hidden" />

            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className="w-full h-full object-cover cursor-crosshair"
            />

            <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-2xl flex items-center justify-between text-white text-xs">
              <span>{statusText}</span>
              <span className="font-mono text-[#8CFF00]">Dedo activo: {selectedFinger.toUpperCase()}</span>
            </div>
          </div>

          {/* AR Controls Sidebar */}
          <div className="lg:col-span-4 bg-white p-6 sm:p-8 rounded-3xl border border-[#8CFF00]/25 shadow-sm space-y-6">
            <div>
              <h3 className="font-display text-lg font-bold text-[#082D05] mb-3">Estilos de Uña AR</h3>
              <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {stylesToUse.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setActiveStyle(st.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      activeStyle === st.id ? 'border-[#8CFF00] bg-[#8CFF00]/10 ring-1 ring-[#8CFF00]' : 'border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${st.bgGradient} border border-[#8CFF00]`}></div>
                      <span className="font-display text-xs font-bold text-[#082D05]">{st.name}</span>
                    </div>
                    <span className="text-[9px] uppercase font-bold text-[#8CFF00]">{st.badge}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-display text-lg font-bold text-[#082D05] mb-2">Forma y Longitud</h3>
              <div className="grid grid-cols-3 gap-2">
                {['almond', 'coffin', 'square'].map(sh => (
                  <button
                    key={sh}
                    onClick={() => setActiveShape(sh as any)}
                    className={`py-2 text-xs font-semibold rounded-xl border capitalize ${
                      activeShape === sh ? 'bg-[#082D05] text-[#F7F8EF]' : 'bg-neutral-50 text-[#082D05]'
                    }`}
                  >
                    {sh}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#082D05] mb-2">Ajustar Rotación ({selectedFinger.toUpperCase()})</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFingers(prev => ({ ...prev, [selectedFinger]: { ...prev[selectedFinger], rotation: prev[selectedFinger].rotation - 5 } }))}
                  className="flex-1 py-2 bg-neutral-100 rounded-xl text-xs font-semibold hover:bg-neutral-200 transition-all"
                >
                  -5°
                </button>
                <button
                  onClick={() => setFingers(prev => ({ ...prev, [selectedFinger]: { ...prev[selectedFinger], rotation: prev[selectedFinger].rotation + 5 } }))}
                  className="flex-1 py-2 bg-neutral-100 rounded-xl text-xs font-semibold hover:bg-neutral-200 transition-all"
                >
                  +5°
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

