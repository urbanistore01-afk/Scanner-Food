import React from 'react';
import { motion } from 'motion/react';
import { Activity, Calendar, ChevronRight } from 'lucide-react';
import { FoodAnalysis } from '../lib/gemini';

export interface ScanHistoryItem {
  id: string;
  date: string;
  image: string;
  result: FoodAnalysis;
}

interface HistoryProps {
  history: ScanHistoryItem[];
  onItemClick: (item: ScanHistoryItem) => void;
}

export default function History({ history, onItemClick }: HistoryProps) {
  return (
    <div className="p-6 flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-6">Histórico de Scans</h2>

      {history.length === 0 ? (
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
        </div>
      )}
    </div>
  );
}
