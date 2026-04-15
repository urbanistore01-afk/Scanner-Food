import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Flame, X, CheckCircle2 } from 'lucide-react';
import { chatWithNutritionist, ChatMessage } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { getUserPlan } from '../lib/subscription';
import { supabase } from '../lib/supabase';

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const data = await api.getChats();
        if (data && data.length > 0) {
          const formattedChats = data.map((item: any) => ({
            role: item.role,
            text: item.content
          }));
          setMessages(formattedChats);
        } else {
          setMessages([
            { role: 'model', text: 'Olá! Sou seu assistente nutricional. Como posso ajudar você hoje com sua dieta ou dúvidas sobre alimentos?' }
          ]);
        }
      } catch (error) {
        console.error("Failed to fetch chats from backend:", error);
        // Fallback to local storage
        const savedHistory = localStorage.getItem('chatHistory');
        if (savedHistory) {
          try {
            setMessages(JSON.parse(savedHistory));
          } catch (e) {
            console.error("Failed to parse chat history");
          }
        } else {
          setMessages([
            { role: 'model', text: 'Olá! Sou seu assistente nutricional. Como posso ajudar você hoje com sua dieta ou dúvidas sobre alimentos?' }
          ]);
        }
      } finally {
        setIsFetching(false);
      }
    };
    
    fetchChats();
  }, []);

  useEffect(() => {
    if (messages.length > 0 && !isFetching) {
      localStorage.setItem('chatHistory', JSON.stringify(messages));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isFetching]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      
      if (user) {
        const plan = await getUserPlan(user.id);
        if (plan !== "premium") {
          setShowPremiumModal(true);
          return;
        }
      }
    } catch (err) {
      console.error("Error checking plan:", err);
    }

    const userMsg = input.trim();
    setInput('');
    
    const newMessages: ChatMessage[] = [...messages, { role: 'user', text: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Save user message to backend
      api.saveChat('user', userMsg).catch(console.error);

      const responseText = await chatWithNutritionist(newMessages, userMsg);
      setMessages([...newMessages, { role: 'model', text: responseText }]);
      
      // Save model message to backend
      api.saveChat('model', responseText).catch(console.error);
    } catch (error) {
      setMessages([...newMessages, { role: 'model', text: 'Desculpe, ocorreu um erro. Tente novamente.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="p-6 pb-2">
        <h2 className="text-2xl font-bold">Nutricionista IA</h2>
        <p className="text-sm opacity-70">Tire suas dúvidas sobre alimentação</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {messages.map((msg, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={idx} 
            className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}
          >
            {msg.role === 'user' ? (
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white text-black">
                <User className="w-5 h-5" />
              </div>
            ) : (
              <img 
                src="/logo.png" 
                alt="Scanner Food AI" 
                className="w-10 h-10 rounded-full object-contain shrink-0 border border-border-base bg-white p-0.5"
              />
            )}
            <div className={`p-3 rounded-2xl text-sm ${
              msg.role === 'user' 
                ? 'bg-white text-black rounded-tr-none' 
                : 'bg-surface-base border border-border-base rounded-tl-none shadow-sm'
            }`}>
              {msg.text}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%] self-start">
            <img 
              src="/logo.png" 
              alt="Scan Food AI" 
              className="w-8 h-8 rounded-full object-cover shrink-0 border border-border-base bg-white"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'w-8 h-8 rounded-full bg-scan-primary text-white flex items-center justify-center shrink-0';
                fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bot"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>';
                e.currentTarget.parentNode?.insertBefore(fallback, e.currentTarget);
              }}
            />
            <div className="p-4 rounded-2xl bg-surface-base border border-border-base rounded-tl-none shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-scan-primary" />
              <span className="text-xs opacity-70">Digitando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-surface-base border-t border-border-base">
        <div className="flex items-center gap-2 bg-bg-base p-2 rounded-full border border-border-base focus-within:border-scan-primary transition-colors">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre calorias, dietas..."
            className="flex-1 bg-transparent border-none outline-none px-4 text-sm"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-full bg-scan-primary text-white flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-scan-primary-hover transition-colors"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
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
              
              <h3 className="text-xl font-bold mb-2">Chat Ilimitado</h3>
              <p className="opacity-80 text-sm mb-6">
                O chat ilimitado com a Nutricionista IA é exclusivo do plano Premium. Assine agora para tirar todas as suas dúvidas!
              </p>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-scan-primary" />
                  <span>Chat ilimitado com IA</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-scan-primary" />
                  <span>Dicas personalizadas</span>
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
