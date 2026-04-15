import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onAuthenticate: (name: string) => void;
}

export default function Auth({ onAuthenticate }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        throw new Error("Supabase URL não configurada. Verifique o arquivo .env");
      }

      let authError;
      
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        authError = error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        authError = error;
      }

      if (authError) throw authError;

      const rawName = email.split('@')[0].split('.')[0];
      const capitalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      onAuthenticate(capitalizedName);
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black text-white relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-scan-primary/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-10"
        >
          <img 
            src="/logo.png" 
            alt="Scanner Food Logo" 
            className="w-20 h-20 object-contain mb-4 drop-shadow-[0_0_15px_rgba(0,200,83,0.4)]" 
          />
          <h1 className="text-3xl font-bold tracking-wide mb-2 font-sans">Scanner Food</h1>
          <p className="text-gray-400 text-sm">Analise seus alimentos com IA</p>
        </motion.div>

        {/* Form Section */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            <motion.form
              key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1">
                <input
                  type="email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#1A1A1A] text-white placeholder-gray-500 border border-[#333] focus:border-scan-primary focus:ring-1 focus:ring-scan-primary outline-none transition-all rounded-2xl px-5 py-4 text-base shadow-inner"
                />
              </div>
              
              <div className="flex flex-col gap-1 mb-2">
                <input
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-[#1A1A1A] text-white placeholder-gray-500 border border-[#333] focus:border-scan-primary focus:ring-1 focus:ring-scan-primary outline-none transition-all rounded-2xl px-5 py-4 text-base shadow-inner"
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm text-center bg-red-500/10 py-2 rounded-xl border border-red-500/20">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-scan-primary text-black font-bold text-lg rounded-2xl py-4 hover:bg-scan-primary-hover transition-all shadow-[0_0_20px_rgba(0,200,83,0.2)] hover:shadow-[0_0_25px_rgba(0,200,83,0.4)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Aguarde...' : (isLogin ? 'Entrar' : 'Criar conta')}
              </button>
            </motion.form>
          </AnimatePresence>
        </div>

        {/* Toggle Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-gray-400 text-sm hover:text-white transition-colors"
          >
            {isLogin ? (
              <>Não tem conta? <span className="text-scan-primary font-semibold">Criar conta</span></>
            ) : (
              <>Já tem conta? <span className="text-scan-primary font-semibold">Entrar</span></>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
