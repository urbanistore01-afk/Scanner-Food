import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Upload, X, CheckCircle2, AlertCircle, Activity, Flame, AlertTriangle, Info, RefreshCw, ShieldAlert, HeartPulse, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { analyzeFoodImage, FoodAnalysis } from '../lib/gemini';
import { api } from '../lib/api';

import { getUserPlan } from '../lib/subscription';
import { supabase } from '../lib/supabase';

interface ScannerProps {
  onScanComplete: (data: FoodAnalysis, image: string) => void;
  initialData?: { image: string, result: FoodAnalysis };
}

export default function Scanner({ onScanComplete, initialData }: ScannerProps) {
  const [image, setImage] = useState<string | null>(initialData?.image || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [result, setResult] = useState<FoodAnalysis | null>(initialData?.result || null);
  const [error, setError] = useState<string | null>(null);
  const [manualNameInput, setManualNameInput] = useState("");
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [zoom, setZoom] = useState(1);
  const [cameraCapabilities, setCameraCapabilities] = useState<MediaTrackCapabilities | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const openCamera = async (mode = facingMode) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
      setFacingMode(mode);

      const track = stream.getVideoTracks()[0];
      if (track && track.getCapabilities) {
        const caps = track.getCapabilities() as any;
        setCameraCapabilities(caps);
        if (caps.zoom) {
          setZoom((track.getSettings() as any).zoom || 1);
        }
      }

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Play error:", e));
        }
      }, 100);
    } catch (err) {
      console.error("Error accessing camera:", err);
      // Fallback to native file input if getUserMedia fails or is denied
      cameraInputRef.current?.click();
    }
  };

  const toggleCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    openCamera(newMode);
  };

  const handleZoomChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setZoom(value);
    
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && track.applyConstraints) {
        try {
          await track.applyConstraints({
            advanced: [{ zoom: value } as any]
          });
        } catch (err) {
          console.error("Error applying zoom:", err);
        }
      }
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setImage(dataUrl);
        setResult(null);
        setError(null);
        closeCamera();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (image && !result && !isAnalyzing && !error && !initialData && !isCameraOpen) {
      startAnalysis();
    }
  }, [image, isCameraOpen]);

  const startAnalysis = async (manualName?: string) => {
    if (!image) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      
      if (user) {
        const plan = await getUserPlan(user.id);
        if (plan !== "premium") {
          setIsAnalyzing(false);
          setShowPremiumModal(true);
          return;
        }
      }

      const compressedImage = await compressImage(image);
      const match = compressedImage.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!match) throw new Error("Invalid image format");
      
      const mimeType = match[1];
      const base64Data = match[2];
      
      const data = await analyzeFoodImage(base64Data, mimeType, typeof manualName === 'string' ? manualName : undefined);
      setResult(data);
      if (data.identificado_com_sucesso) {
        try {
          await api.saveScan(data, compressedImage);
        } catch (apiError) {
          console.error("Failed to save scan to backend:", apiError);
        }
        onScanComplete(data, compressedImage);
      }
    } catch (err) {
      setError("Falha ao analisar a imagem. Tente novamente.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetScanner = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setManualNameInput("");
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-scan-primary';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full relative overflow-hidden">
      {/* Background Image with Sophisticated Radial Mask */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-700"
        style={{ 
          backgroundImage: 'url("/fundo-comida-2.jpg"), url("https://images.unsplash.com/photo-1546964124-0cce460f38ef?auto=format&fit=crop&q=80&w=1920")',
          opacity: image ? 0 : 'var(--theme-image-opacity)',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 110%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 110%)'
        }}
      >
        {/* Soft linear gradients to blend edges even more */}
        <div className="absolute inset-0 bg-gradient-to-b from-bg-base/40 via-transparent to-bg-base/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-base/20 via-transparent to-bg-base/20" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        {isCameraOpen && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            <div className="flex-1 relative">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              
              {/* Camera Controls Overlay */}
              <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
                <button 
                  onClick={toggleCamera}
                  className="p-3 bg-black/50 text-white rounded-full backdrop-blur-md border border-white/10"
                >
                  <RefreshCw className="w-6 h-6" />
                </button>
                <button 
                  onClick={closeCamera}
                  className="p-3 bg-black/50 text-white rounded-full backdrop-blur-md border border-white/10"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Zoom Slider */}
              {(cameraCapabilities as any)?.zoom && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-2/3 max-w-[200px] flex flex-col gap-2 bg-black/30 p-4 rounded-3xl backdrop-blur-sm border border-white/5">
                  <div className="flex justify-between text-[10px] text-white/70 font-bold uppercase tracking-widest">
                    <span>1x</span>
                    <span>{(cameraCapabilities as any).zoom.max}x</span>
                  </div>
                  <input 
                    type="range"
                    min={(cameraCapabilities as any).zoom.min || 1}
                    max={(cameraCapabilities as any).zoom.max || 1}
                    step={0.1}
                    value={zoom}
                    onChange={handleZoomChange}
                    className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-scan-primary"
                  />
                </div>
              )}
            </div>
            <div className="h-32 bg-black flex items-center justify-center pb-8">
              <button 
                onClick={takePhoto}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
              >
                <div className="w-16 h-16 bg-white rounded-full"></div>
              </button>
            </div>
          </div>
        )}

        {!initialData && <h2 className="text-2xl font-bold mb-6 text-shadow-adaptive">Scanner Avançado</h2>}

        {!image ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex-1 flex flex-col items-center justify-center gap-8 w-full"
          >
            <div className="w-full max-w-xl aspect-square border-2 border-dashed border-scan-primary rounded-3xl flex flex-col items-center justify-center bg-surface-base/50 p-8 text-center backdrop-blur-sm shadow-xl">
              <Camera className="w-16 h-16 text-scan-primary mb-6 opacity-70 drop-shadow-md" />
              <p className="font-bold text-xl mb-2 text-shadow-adaptive">Tire uma foto ou faça upload</p>
              <p className="text-sm opacity-80 text-shadow-adaptive">Formatos suportados: JPG, PNG</p>
            </div>
            
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              className="hidden" 
              ref={cameraInputRef}
              onChange={handleImageUpload}
            />
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={galleryInputRef}
              onChange={handleImageUpload}
            />
            
            <div className="flex flex-col gap-4 w-full max-w-xl">
              <button 
                onClick={openCamera}
                className="flex items-center gap-2 bg-scan-primary text-white px-8 py-4 rounded-full font-bold shadow-xl hover:bg-scan-primary-hover transition-colors justify-center"
              >
                <Camera className="w-5 h-5 drop-shadow-md" />
                <span className="drop-shadow-md">Tirar Foto</span>
              </button>
              <button 
                onClick={() => galleryInputRef.current?.click()}
                className="flex items-center gap-2 bg-surface-base/80 border border-border-base px-8 py-4 rounded-full font-bold shadow-xl hover:border-scan-primary transition-colors justify-center backdrop-blur-md"
              >
                <ImageIcon className="w-5 h-5 drop-shadow-md" />
                <span className="text-shadow-adaptive">Upload da Galeria</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 flex flex-col gap-6 pb-24">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-3xl overflow-hidden shadow-lg bg-black aspect-square max-h-[60vh] shrink-0 flex items-center justify-center"
            >
              <img src={image} alt="Food to analyze" className="w-full h-full object-contain opacity-90" />
              
              {!isAnalyzing && !initialData && (
                <button 
                  onClick={resetScanner}
                  className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full backdrop-blur-md"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              
              <AnimatePresence>
                {isAnalyzing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white overflow-hidden"
                  >
                    {/* Laser Animation */}
                    <motion.div
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute left-0 right-0 h-1 bg-scan-primary shadow-[0_0_20px_rgba(0,200,83,1)] z-10"
                    />
                    
                    {/* Grid Overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20"></div>

                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative z-20 flex flex-col items-center bg-black/40 p-6 rounded-3xl backdrop-blur-md border border-white/10"
                    >
                      <div className="relative w-16 h-16 mb-4">
                        <div className="absolute inset-0 border-4 border-scan-primary/30 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-scan-primary rounded-full border-t-transparent animate-spin"></div>
                        <Activity className="absolute inset-0 m-auto w-6 h-6 text-scan-primary animate-pulse" />
                      </div>
                      <p className="font-bold text-lg tracking-wide mb-1">Analisando...</p>
                      <p className="text-xs opacity-70 text-center max-w-[200px]">Identificando nutrientes com IA Flash</p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {error && (
              <div className="bg-red-900/30 text-red-200 p-4 rounded-2xl flex items-start gap-3 backdrop-blur-md">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm mb-2">{error}</p>
                  <button 
                    onClick={() => startAnalysis()}
                    className="text-xs font-bold underline"
                  >
                    Tentar Novamente
                  </button>
                </div>
              </div>
            )}

            <AnimatePresence>
              {result && result.identificado_com_sucesso === false && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface-base/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-border-base flex flex-col gap-4"
                >
                  <div className="flex items-center gap-3 text-yellow-500 mb-2">
                    <AlertCircle className="w-6 h-6" />
                    <h3 className="font-bold text-lg">Não conseguimos identificar</h3>
                  </div>
                  <p className="text-sm opacity-80">
                    A inteligência artificial não conseguiu reconhecer este alimento com precisão. Por favor, digite o nome do alimento para uma análise detalhada.
                  </p>
                  <input
                    type="text"
                    placeholder="Ex: Prato de arroz com feijão e bife..."
                    value={manualNameInput}
                    onChange={(e) => setManualNameInput(e.target.value)}
                    className="w-full bg-bg-base border border-border-base rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-scan-primary transition-colors"
                  />
                  <button
                    onClick={() => startAnalysis(manualNameInput)}
                    disabled={!manualNameInput.trim() || isAnalyzing}
                    className="w-full bg-scan-primary text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-opacity"
                  >
                    Analisar Novamente
                  </button>
                </motion.div>
              )}

              {result && result.identificado_com_sucesso !== false && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-6"
                >
                  {/* Cabeçalho do Resultado */}
                  <div className="bg-surface-base/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-border-base">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-2xl capitalize mb-1">{result.nome_prato}</h3>
                        <p className="text-sm opacity-70 capitalize">{result.porcao}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Flame className="w-4 h-4 text-scan-primary" />
                      <span className="font-bold text-xl">{result.calorias} kcal</span>
                    </div>
                  </div>

                  {/* Confiança Baixa */}
                  {result.confianca < 60 && (
                    <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-2xl flex items-start gap-3 backdrop-blur-md">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-yellow-400">Baixa Confiança ({result.confianca}%)</p>
                        <p className="text-xs text-yellow-500 mt-1">A imagem não está clara. Os resultados podem ser imprecisos. Sugerimos tirar outra foto.</p>
                      </div>
                    </div>
                  )}

                  {/* Macronutrientes */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-bold text-scan-primary uppercase tracking-widest">Macronutrientes</h4>
                      <button 
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-xs font-bold text-scan-primary flex items-center gap-1 bg-scan-primary/10 px-3 py-1 rounded-full"
                      >
                        {showDetails ? <><ChevronUp className="w-3 h-3" /> Menos Detalhes</> : <><ChevronDown className="w-3 h-3" /> Ver Detalhes</>}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      <NutrientCard label="Proteínas" value={result.proteinas} unit="g" color="bg-blue-500" />
                      <NutrientCard label="Carboidratos" value={result.carboidratos} unit="g" color="bg-orange-500" />
                      <NutrientCard label="Gorduras" value={result.gorduras} unit="g" color="bg-yellow-500" />
                      <NutrientCard label="Açúcares" value={result.acucares} unit="g" color="bg-red-500" />
                    </div>

                    <AnimatePresence>
                      {showDetails && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-surface-base/80 backdrop-blur-md rounded-3xl p-5 border border-border-base flex flex-col gap-4 mb-4">
                            <DetailRow 
                              label="Proteínas" 
                              desc="Essenciais para construção muscular e reparação de tecidos." 
                              value={result.proteinas} 
                              total={result.proteinas + result.carboidratos + result.gorduras}
                              color="bg-blue-500"
                            />
                            <DetailRow 
                              label="Carboidratos" 
                              desc="Principal fonte de energia para o corpo e cérebro." 
                              value={result.carboidratos} 
                              total={result.proteinas + result.carboidratos + result.gorduras}
                              color="bg-orange-500"
                            />
                            <DetailRow 
                              label="Gorduras" 
                              desc="Importantes para absorção de vitaminas e saúde hormonal." 
                              value={result.gorduras} 
                              total={result.proteinas + result.carboidratos + result.gorduras}
                              color="bg-yellow-500"
                            />
                            <div className="pt-2 border-t border-border-base">
                              <p className="text-[10px] opacity-60 italic">
                                * A distribuição ideal varia conforme seu objetivo (hipertrofia, emagrecimento, etc).
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Micronutrientes */}
                  <div>
                    <h4 className="text-xs font-bold text-scan-primary mb-3 uppercase tracking-widest">Micronutrientes</h4>
                    <div className="bg-surface-base/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-border-base">
                      <div className="grid grid-cols-1 gap-y-4">
                        <MicroNutrientRow 
                          label="Fibras" 
                          value={result.micronutrientes?.fibras_g || 0} 
                          unit="g" 
                          info="Melhora a digestão e saciedade."
                          showDetails={showDetails}
                        />
                        <MicroNutrientRow 
                          label="Sódio" 
                          value={result.micronutrientes?.sodio_mg || 0} 
                          unit="mg" 
                          info="Regula a pressão arterial (evite excessos)."
                          showDetails={showDetails}
                        />
                        <MicroNutrientRow 
                          label="Vitamina C" 
                          value={result.micronutrientes?.vitamina_c_mg || 0} 
                          unit="mg" 
                          info="Fortalece o sistema imunológico."
                          showDetails={showDetails}
                        />
                        <MicroNutrientRow 
                          label="Cálcio" 
                          value={result.micronutrientes?.calcio_mg || 0} 
                          unit="mg" 
                          info="Saúde dos ossos e dentes."
                          showDetails={showDetails}
                        />
                        <MicroNutrientRow 
                          label="Ferro" 
                          value={result.micronutrientes?.ferro_mg || 0} 
                          unit="mg" 
                          info="Transporte de oxigênio no sangue."
                          showDetails={showDetails}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Análise Inteligente */}
                  <div>
                    <h4 className="text-xs font-bold text-scan-primary mb-3 uppercase tracking-widest flex items-center gap-2">
                      <HeartPulse className="w-4 h-4" /> Análise Inteligente
                    </h4>
                    <div className="bg-surface-base/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-border-base flex flex-col gap-5">
                      
                      <div>
                        <p className="text-sm font-bold mb-1 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-scan-primary" /> Adequação a Dietas
                        </p>
                        <p className="text-sm opacity-80 leading-relaxed">{result.insights.dietas}</p>
                      </div>

                      <div>
                        <p className="text-sm font-bold mb-1 flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-scan-primary" /> Alternativas Menos Calóricas
                        </p>
                        <p className="text-sm opacity-80 leading-relaxed">{result.insights.alternativas_menos_caloricas}</p>
                      </div>

                      <div>
                        <p className="text-sm font-bold mb-1 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-scan-primary" /> Versões Mais Saudáveis
                        </p>
                        <p className="text-sm opacity-80 leading-relaxed">{result.insights.versoes_mais_saudaveis}</p>
                      </div>

                      <div className="bg-bg-base/50 p-4 rounded-2xl border border-border-base">
                        <p className="text-sm font-bold mb-1 flex items-center gap-2">
                          <Info className="w-4 h-4 text-scan-primary" /> Recomendação Prática
                        </p>
                        <p className="text-sm opacity-80 leading-relaxed">{result.insights.recomendacao}</p>
                      </div>

                    </div>
                  </div>

                  {/* Aviso Legal */}
                  <div className="flex items-start gap-2 opacity-50 px-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-tight">
                      Estimativas baseadas em Inteligência Artificial. Os valores podem variar. 
                      Este aplicativo não substitui a orientação de um nutricionista ou médico profissional.
                    </p>
                  </div>

                  {!initialData && (
                    <button 
                      onClick={resetScanner}
                      className="w-full py-4 mt-4 border-2 border-scan-primary text-scan-primary rounded-2xl font-bold hover:bg-scan-primary hover:text-white transition-colors flex items-center justify-center gap-2 backdrop-blur-md"
                    >
                      <Camera className="w-5 h-5" />
                      Escanear Outro Alimento
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Premium Modal */}
      <AnimatePresence>
        {showPremiumModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface-base border border-border-base p-6 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-amber-600" />
              <button 
                onClick={() => setShowPremiumModal(false)}
                className="absolute top-4 right-4 p-2 bg-bg-base rounded-full hover:bg-border-base transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="w-12 h-12 bg-gradient-to-tr from-yellow-400 to-amber-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
                <Flame className="w-6 h-6 text-white" />
              </div>
              
              <h3 className="text-xl font-bold mb-2">Limite Gratuito Atingido</h3>
              <p className="opacity-80 text-sm mb-6">
                Você atingiu o limite de scans gratuitos. Assine o Premium para continuar analisando suas refeições e desbloquear recursos exclusivos!
              </p>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-scan-primary" />
                  <span>Scans ilimitados</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-scan-primary" />
                  <span>Análises nutricionais completas</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-scan-primary" />
                  <span>Veja substituições mais saudáveis</span>
                </li>
              </ul>
              
              <button 
                onClick={() => setShowPremiumModal(false)}
                className="w-full py-3 bg-gradient-to-r from-scan-primary to-scan-primary-hover text-white rounded-xl font-bold shadow-lg shadow-scan-primary/20"
              >
                Entendi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NutrientCard({ label, value, unit, color }: { label: string, value: number, unit: string, color?: string }) {
  return (
    <div className="bg-surface-base border border-border-base p-2 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
      {color && <div className={`absolute top-0 left-0 right-0 h-1 ${color} opacity-50`} />}
      <p className="text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1 truncate w-full">{label}</p>
      <p className="font-black text-base">
        {value} <span className="text-[10px] font-normal opacity-60">{unit}</span>
      </p>
    </div>
  );
}

function DetailRow({ label, desc, value, total, color }: { label: string, desc: string, value: number, total: number, color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-end">
        <span className="text-sm font-bold">{label}</span>
        <span className="text-xs font-bold">{value}g ({percentage.toFixed(0)}%)</span>
      </div>
      <div className="w-full h-2 bg-bg-base rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${color}`}
        />
      </div>
      <p className="text-[10px] opacity-70 leading-tight mt-1">{desc}</p>
    </div>
  );
}

function MicroNutrientRow({ label, value, unit, info, showDetails }: { label: string, value: number, unit: string, info?: string, showDetails?: boolean }) {
  return (
    <div className="flex flex-col border-b border-border-base pb-3 last:border-0 last:pb-0">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-bold text-sm">{value} <span className="text-[10px] font-normal opacity-60">{unit}</span></span>
      </div>
      <AnimatePresence>
        {showDetails && info && (
          <motion.p 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="text-[10px] opacity-60 mt-1 leading-tight overflow-hidden"
          >
            {info}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
