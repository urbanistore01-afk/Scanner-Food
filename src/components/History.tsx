import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Activity, Calendar, ChevronRight, Lock, Flame } from 'lucide-react';
import { FoodAnalysis } from '../lib/gemini';
import { supabase } from '../lib/supabase';

export interface ScanHistoryItem {
  id: string;
  date: string;
  image: string;
  result: FoodAnalysis;
}

interface HistoryProps {
  history: ScanHistoryItem[];
  onItemClick: (item: ScanHistoryItem) => void;
  isPremium?: boolean;
}

export default function History({ history: localHistory, onItemClick, isPremium }: HistoryProps) {
  const [history, setHistory] = useState<ScanHistoryItem[]>(localHistory);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await supabase
          .from('scans')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && Array.isArray(data)) {
          const formattedHistory = data.map((item: any) => ({
            id: item.id,
            date: item.created_at,
            image: item.image_url,
            result: item.result
          }));
          
          const limitedHistory = isPremium ? formattedHistory : formattedHistory.slice(0, 3);
          setHistory(limitedHistory);
        }
      } catch (error) {
        console.error("Failed to fetch history from Supabase:", error);
        // Fallback to local history
        const limitedHistory = isPremium ? localHistory : localHistory.slice(0, 3);
        setHistory(limitedHistory);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isPremium, localHistory]);

  return (
    <div className="p-6 flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-6">Histórico de Scans</h2>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-scan-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : history.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
          <Activity className="w-12 h-12 mb-4 opacity-50" />
          <p>Nenhum alimento escaneado ainda.</p>
          <p className="text-sm mt-2">Seus scans aparecerão aqui.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-20">
          {history.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onItemClick(item)}
              className="bg-surface-base rounded-2xl p-4 shadow-sm border border-border-base flex items-center gap-4 cursor-pointer hover:border-scan-primary transition-colors"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-black">
                <img src={item.image} alt={item.result.nome_prato} className="w-full h-full object-cover opacity-80" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate capitalize">{item.result.nome_prato}</h3>
                <div className="flex items-center gap-3 text-sm opacity-70 mt-1">
                  <span className="font-medium text-scan-primary">{item.result.calorias} kcal</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              </div>
              
              <ChevronRight className="w-5 h-5 opacity-40 shrink-0" />
            </motion.div>
          ))}
          
          {!isPremium && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-6 bg-gradient-to-br from-surface-base to-bg-base border border-amber-500/30 rounded-3xl text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-amber-600" />
              <div className="w-12 h-12 bg-gradient-to-tr from-yellow-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/20">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-1">Histórico Completo</h3>
              <p className="text-sm opacity-70 mb-4">
                O plano gratuito exibe apenas os 3 últimos scans. Assine o Premium para ver todo o seu histórico.
              </p>
              <button className="bg-gradient-to-r from-scan-primary to-scan-primary-hover text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg shadow-scan-primary/20">
                Upgrade para Premium
              </button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
