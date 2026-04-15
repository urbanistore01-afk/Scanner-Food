import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Camera, Activity, ChevronRight, Target } from 'lucide-react';
import { FoodAnalysis } from '../lib/gemini';
import { ScanHistoryItem } from './History';
import { getGoals, getGoalsAsync, NutritionalGoals } from '../lib/goals';

interface HomeProps {
  onScanClick: () => void;
  onHistoryClick: () => void;
  lastScan: FoodAnalysis | null;
  scanHistory: ScanHistoryItem[];
  userName?: string;
  isPremium?: boolean;
}

export default function Home({ onScanClick, onHistoryClick, lastScan, scanHistory, userName, isPremium }: HomeProps) {
  const [goals, setGoals] = useState<NutritionalGoals>(getGoals());
  const [dailyIntake, setDailyIntake] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });

  useEffect(() => {
    getGoalsAsync().then(setGoals);
  }, []);

  useEffect(() => {
    const today = new Date().toDateString();
    let calories = 0, protein = 0, carbs = 0, fats = 0;

    scanHistory.forEach(item => {
      if (new Date(item.date).toDateString() === today && item.result.identificado_com_sucesso) {
        calories += item.result.calorias || 0;
        protein += item.result.proteinas || 0;
        carbs += item.result.carboidratos || 0;
        fats += item.result.gorduras || 0;
      }
    });

    setDailyIntake({ calories, protein, carbs, fats });
    setGoals(getGoals());
  }, [scanHistory]);

  const getProgress = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100)) || 0;
  };
  return (
    <div className="p-6 flex flex-col gap-8 relative min-h-full overflow-hidden">
      {/* Background Image with Sophisticated Radial Mask */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-700 scale-110"
        style={{ 
          backgroundImage: 'url("/fundo-comida-1.jpg"), url("https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1920")',
          opacity: 'var(--theme-image-opacity)',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 110%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 110%)'
        }}
      >
        {/* Soft linear gradients to blend edges even more */}
        <div className="absolute inset-0 bg-gradient-to-b from-bg-base/40 via-transparent to-bg-base/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-base/20 via-transparent to-bg-base/20" />
      </div>

      <div className="relative z-10 flex flex-col gap-8">
        <header className="pt-4">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="font-bold text-shadow-adaptive" style={{ fontSize: '36px' }}>Olá{userName ? `, ${userName}` : ''}!</h2>
            {isPremium && (
              <span className="bg-gradient-to-r from-yellow-400 to-amber-600 text-white text-[10px] uppercase font-bold px-2.5 py-1 rounded-full shadow-sm mt-2">
                Premium
              </span>
            )}
          </div>
          <p className="opacity-80 text-shadow-adaptive">Pronto para descobrir o que você vai comer hoje?</p>
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-scan-primary text-white p-6 rounded-3xl shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Novo Scan</h3>
            <p className="mb-6 opacity-90 text-sm max-w-[200px]">Tire uma foto do seu prato para análise instantânea.</p>
            <button 
              onClick={onScanClick}
              className="flex items-center gap-2 bg-white text-scan-primary px-5 py-2.5 rounded-full font-bold shadow-md hover:scale-105 transition-transform"
            >
              <Camera className="w-5 h-5" />
              Escanear Agora
            </button>
          </div>
        </motion.div>

        {/* Nutritional Goals Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-base p-5 rounded-3xl shadow-sm border border-border-base"
        >
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-scan-primary" />
            <h3 className="text-lg font-bold">Metas Diárias</h3>
          </div>
          
          <div className="flex flex-col gap-4">
            <ProgressRow label="Calorias" current={dailyIntake.calories} target={goals.calories} unit="kcal" color="bg-scan-primary" />
            <ProgressRow label="Proteínas" current={dailyIntake.protein} target={goals.protein} unit="g" color="bg-blue-500" />
            <ProgressRow label="Carboidratos" current={dailyIntake.carbs} target={goals.carbs} unit="g" color="bg-orange-500" />
            <ProgressRow label="Gorduras" current={dailyIntake.fats} target={goals.fats} unit="g" color="bg-yellow-500" />
          </div>
        </motion.div>

        <div>
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-lg font-bold">Último Scan</h3>
            {lastScan && (
              <button onClick={onHistoryClick} className="text-sm text-scan-primary font-medium flex items-center">
                Ver histórico <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {lastScan ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-surface-base p-5 rounded-3xl shadow-sm border border-border-base cursor-pointer hover:border-scan-primary transition-colors"
              onClick={onHistoryClick}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-scan-primary/20 rounded-2xl flex items-center justify-center text-scan-primary">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold capitalize">{lastScan.nome_prato}</h4>
                  <p className="text-sm opacity-70">{lastScan.porcao}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-base p-3 rounded-2xl">
                  <p className="text-xs opacity-70 mb-1">Calorias</p>
                  <p className="font-bold text-lg">{lastScan.calorias} <span className="text-xs font-normal opacity-70">kcal</span></p>
                </div>
                <div className="bg-bg-base p-3 rounded-2xl">
                  <p className="text-xs opacity-70 mb-1">Proteínas</p>
                  <p className="font-bold text-lg">{lastScan.proteinas} <span className="text-xs font-normal opacity-70">g</span></p>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-surface-base/50 border border-dashed border-border-base p-8 rounded-3xl text-center">
              <p className="opacity-60 text-sm">Nenhum alimento escaneado ainda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, current, target, unit, color }: { label: string, current: number, target: number, unit: string, color: string }) {
  const progress = Math.min(100, Math.round((current / target) * 100)) || 0;
  
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium">{label}</span>
        <span className="opacity-70">{current} / {target} {unit}</span>
      </div>
      <div className="h-2 w-full bg-bg-base rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color} rounded-full`}
        />
      </div>
    </div>
  );
}
