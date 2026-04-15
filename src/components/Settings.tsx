import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, Sun, Bell, RotateCcw, Trash2, Info, FileText, Shield, ChevronRight, X, Target, Flame } from 'lucide-react';
import { requestNotificationPermission, NOTIFICATIONS_ENABLED_KEY } from '../lib/notifications';
import { getGoals, getGoalsAsync, saveGoalsAsync, NutritionalGoals } from '../lib/goals';
import { supabase } from '../lib/supabase';

interface SettingsProps {
  onResetOnboarding: () => void;
}

export default function Settings({ onResetOnboarding }: SettingsProps) {
  const [isLightMode, setIsLightMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'about' | 'terms' | 'privacy' | 'goals' | null>(null);
  const [goals, setGoals] = useState<NutritionalGoals>(getGoals());
  const [isActivatingPremium, setIsActivatingPremium] = useState(false);

  useEffect(() => {
    getGoalsAsync().then(setGoals);
  }, []);

  useEffect(() => {
    setIsLightMode(document.documentElement.classList.contains('light'));
    const notif = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    if (notif !== null) setNotificationsEnabled(notif === 'true');
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const ativarPremium = async () => {
    try {
      setIsActivatingPremium(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        showToast("Você precisa estar logado para assinar o Premium.");
        return;
      }

      const { error } = await supabase.from("subscriptions").upsert([
        {
          user_id: user.id,
          plan: "premium",
          status: "active"
        }
      ], { onConflict: 'user_id' });

      if (error) throw error;

      showToast("Premium ativado com sucesso! 🔥");
      // Reload to apply premium status everywhere
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error("Error activating premium:", error);
      showToast("Erro ao ativar Premium. Tente novamente.");
    } finally {
      setIsActivatingPremium(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = !isLightMode;
    setIsLightMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
      showToast("Modo claro ativado");
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
      showToast("Modo escuro ativado");
    }
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationsEnabled(true);
        showToast("Notificações ativadas com sucesso 🔔");
      } else {
        setNotificationsEnabled(false);
      }
    } else {
      localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");
      setNotificationsEnabled(false);
      showToast("Notificações desativadas");
    }
  };

  const handleResetData = () => {
    localStorage.clear();
    window.location.reload();
  };

  const renderModalContent = () => {
    switch (activeModal) {
      case 'about':
        return (
          <>
            <h3 className="text-2xl font-bold mb-4">Sobre o App</h3>
            <p className="opacity-80 leading-relaxed">
              Scanner Food é um aplicativo inteligente que utiliza inteligência artificial para analisar alimentos a partir de imagens, fornecendo informações nutricionais detalhadas e recomendações baseadas em princípios científicos.
              <br/><br/>
              Nosso objetivo é ajudar usuários a tomarem decisões alimentares mais conscientes de forma prática, rápida e acessível.
            </p>
          </>
        );
      case 'terms':
        return (
          <>
            <h3 className="text-2xl font-bold mb-4">Termos de Uso</h3>
            <p className="opacity-80 leading-relaxed">
              O uso do Scanner Food é destinado para fins informativos e educacionais. As informações fornecidas pela inteligência artificial são estimativas e não substituem orientação profissional.
              <br/><br/>
              Ao utilizar o aplicativo, o usuário concorda com o uso responsável das informações apresentadas.
            </p>
          </>
        );
      case 'privacy':
        return (
          <>
            <h3 className="text-2xl font-bold mb-4">Política de Privacidade</h3>
            <p className="opacity-80 leading-relaxed">
              O Scanner Food respeita sua privacidade. As imagens enviadas são utilizadas exclusivamente para análise nutricional e não são armazenadas sem consentimento.
              <br/><br/>
              Dados locais podem ser salvos no dispositivo para melhorar a experiência do usuário.
            </p>
          </>
        );
      case 'goals':
        return (
          <>
            <h3 className="text-2xl font-bold mb-4">Metas Nutricionais</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 opacity-80">Calorias (kcal)</label>
                <input 
                  type="number" 
                  value={goals.calories} 
                  onChange={(e) => setGoals({...goals, calories: Number(e.target.value)})}
                  className="w-full bg-bg-base border border-border-base rounded-xl px-4 py-3 focus:outline-none focus:border-scan-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-80">Proteínas (g)</label>
                <input 
                  type="number" 
                  value={goals.protein} 
                  onChange={(e) => setGoals({...goals, protein: Number(e.target.value)})}
                  className="w-full bg-bg-base border border-border-base rounded-xl px-4 py-3 focus:outline-none focus:border-scan-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-80">Carboidratos (g)</label>
                <input 
                  type="number" 
                  value={goals.carbs} 
                  onChange={(e) => setGoals({...goals, carbs: Number(e.target.value)})}
                  className="w-full bg-bg-base border border-border-base rounded-xl px-4 py-3 focus:outline-none focus:border-scan-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-80">Gorduras (g)</label>
                <input 
                  type="number" 
                  value={goals.fats} 
                  onChange={(e) => setGoals({...goals, fats: Number(e.target.value)})}
                  className="w-full bg-bg-base border border-border-base rounded-xl px-4 py-3 focus:outline-none focus:border-scan-primary transition-colors"
                />
              </div>
              <button 
                onClick={() => {
                  saveGoalsAsync(goals);
                  setActiveModal(null);
                  showToast("Metas salvas com sucesso!");
                }}
                className="w-full bg-scan-primary text-white font-bold py-3 rounded-xl mt-2 shadow-lg hover:bg-scan-primary-hover transition-colors"
              >
                Salvar Metas
              </button>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 pb-24 flex flex-col gap-8 relative">
      <h2 className="text-3xl font-bold">Configurações</h2>

      {/* Premium */}
      <section>
        <h3 className="text-xs font-bold text-amber-500 mb-3 uppercase tracking-widest">Assinatura</h3>
        <div className="bg-gradient-to-br from-surface-base to-bg-base rounded-3xl overflow-hidden shadow-sm border border-amber-500/30 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-amber-600" />
          <div className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-yellow-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-lg">Scanner Food Premium</h4>
                <p className="text-xs opacity-70">Desbloqueie análises completas 🔥</p>
              </div>
            </div>
            <button 
              onClick={ativarPremium}
              disabled={isActivatingPremium}
              className="w-full mt-2 py-3 bg-gradient-to-r from-scan-primary to-scan-primary-hover text-white rounded-xl font-bold shadow-lg shadow-scan-primary/20 disabled:opacity-50 transition-all hover:scale-[1.02]"
            >
              {isActivatingPremium ? 'Ativando...' : 'Assinar Premium'}
            </button>
          </div>
        </div>
      </section>

      {/* Aparência */}
      <section>
        <h3 className="text-xs font-bold text-scan-primary mb-3 uppercase tracking-widest">Aparência</h3>
        <div className="bg-surface-base rounded-3xl overflow-hidden shadow-sm border border-border-base">
          <SettingToggle 
            icon={isLightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            label="Modo claro / escuro"
            isActive={isLightMode}
            onClick={toggleTheme}
          />
        </div>
      </section>

      {/* Notificações */}
      <section>
        <h3 className="text-xs font-bold text-scan-primary mb-3 uppercase tracking-widest">Notificações</h3>
        <div className="bg-surface-base rounded-3xl overflow-hidden shadow-sm border border-border-base">
          <SettingToggle 
            icon={<Bell className="w-5 h-5" />}
            label="Ativar notificações"
            isActive={notificationsEnabled}
            onClick={toggleNotifications}
          />
        </div>
      </section>

      {/* Metas Nutricionais */}
      <section>
        <h3 className="text-xs font-bold text-scan-primary mb-3 uppercase tracking-widest">Metas</h3>
        <div className="bg-surface-base rounded-3xl overflow-hidden shadow-sm border border-border-base">
          <SettingButton 
            icon={<Target className="w-5 h-5" />}
            label="Metas Nutricionais"
            onClick={() => setActiveModal('goals')}
          />
        </div>
      </section>

      {/* Uso do App */}
      <section>
        <h3 className="text-xs font-bold text-scan-primary mb-3 uppercase tracking-widest">Uso do App</h3>
        <div className="bg-surface-base rounded-3xl overflow-hidden shadow-sm border border-border-base flex flex-col">
          <SettingButton 
            icon={<RotateCcw className="w-5 h-5" />}
            label="Ver tutorial novamente"
            onClick={onResetOnboarding}
          />
          <div className="h-px bg-border-base w-full" />
          <SettingButton 
            icon={<Trash2 className="w-5 h-5" />}
            label="Resetar dados do app"
            onClick={() => setShowResetConfirm(true)}
            textColor="text-red-500"
          />
        </div>
      </section>

      {/* Sobre */}
      <section>
        <h3 className="text-xs font-bold text-scan-primary mb-3 uppercase tracking-widest">Sobre</h3>
        <div className="bg-surface-base rounded-3xl overflow-hidden shadow-sm border border-border-base flex flex-col">
          <SettingButton icon={<Info className="w-5 h-5" />} label="Sobre o app" onClick={() => setActiveModal('about')} />
          <div className="h-px bg-border-base w-full" />
          <SettingButton icon={<FileText className="w-5 h-5" />} label="Termos de uso" onClick={() => setActiveModal('terms')} />
          <div className="h-px bg-border-base w-full" />
          <SettingButton icon={<Shield className="w-5 h-5" />} label="Política de privacidade" onClick={() => setActiveModal('privacy')} />
        </div>
      </section>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-invert-bg text-invert-text px-6 py-3 rounded-full shadow-2xl font-medium text-sm z-50 whitespace-nowrap"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Modals */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setActiveModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-surface-base rounded-3xl p-8 w-full max-w-md relative z-10 shadow-2xl border border-border-base"
            >
              <button 
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-2 bg-overlay rounded-full hover:bg-overlay transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              {renderModalContent()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowResetConfirm(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface-base rounded-3xl p-6 w-full max-w-sm relative z-10 shadow-2xl border border-border-base"
            >
              <div className="w-16 h-16 rounded-full bg-red-900/30 text-red-500 flex items-center justify-center mb-6 mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-3">Resetar tudo?</h3>
              <p className="text-center text-sm opacity-70 mb-8">
                Isso apagará todo o seu histórico de scans, conversas e preferências. Essa ação não pode ser desfeita.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleResetData}
                  className="w-full py-4 rounded-2xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                >
                  Sim, resetar dados
                </button>
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="w-full py-4 rounded-2xl font-bold bg-bg-base border border-border-base hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingToggle({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full p-5 flex items-center justify-between hover:bg-overlay transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className="text-text-base/70 group-hover:text-scan-primary transition-colors">
          {icon}
        </div>
        <span className="font-medium text-lg">{label}</span>
      </div>
      <div className={`w-14 h-8 rounded-full transition-colors relative ${isActive ? 'bg-scan-primary' : 'bg-toggle-bg'}`}>
        <div className={`w-6 h-6 rounded-full bg-white absolute top-1 transition-transform ${isActive ? 'translate-x-7' : 'translate-x-1'}`} />
      </div>
    </button>
  );
}

function SettingButton({ icon, label, onClick, textColor = "" }: { icon: React.ReactNode, label: string, onClick?: () => void, textColor?: string }) {
  return (
    <button 
      onClick={onClick}
      className="w-full p-5 flex items-center justify-between hover:bg-overlay transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className={`text-text-base/70 group-hover:text-scan-primary transition-colors ${textColor}`}>
          {icon}
        </div>
        <span className={`font-medium text-lg ${textColor}`}>{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity group-hover:translate-x-1" />
    </button>
  );
}
