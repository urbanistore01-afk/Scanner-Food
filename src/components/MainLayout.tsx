import React, { useEffect } from 'react';
import { Home, Camera, MessageSquare, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MainLayoutProps {
  children: React.ReactNode;
  currentTab: 'home' | 'scanner' | 'chat' | 'settings' | 'history';
  onTabChange: (tab: 'home' | 'scanner' | 'chat' | 'settings' | 'history') => void;
}

export default function MainLayout({ children, currentTab, onTabChange }: MainLayoutProps) {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-bg-base text-text-base transition-colors duration-300 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-bg-base/80 backdrop-blur-md border-b border-border-base">
        <div className="flex items-center justify-between px-6 py-3 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-[2px]">
            <img 
              src="/logo.png" 
              alt="Scanner Food Logo" 
              className="h-[49px] w-[49px] object-contain" 
            />
            <h1 className="text-xl font-bold tracking-wide font-sans" style={{ color: '#0b9900' }}>
              Scanner Food
            </h1>
          </div>
          <button 
            onClick={() => onTabChange('settings')}
            className={`p-2 rounded-full transition-colors ${currentTab === 'settings' ? 'bg-scan-primary/10 text-scan-primary' : 'hover:bg-overlay'}`}
          >
            <SettingsIcon className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content with Page Transitions */}
      <main className="flex-1 w-full max-w-2xl mx-auto pb-28 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modern Bottom Navbar (Reels Style) */}
      <nav className="fixed bottom-6 left-6 right-6 z-50 max-w-2xl mx-auto">
        <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-full px-8 py-3 flex justify-between items-center shadow-2xl">
          <NavItem 
            icon={<Home />} 
            isActive={currentTab === 'home'} 
            onClick={() => onTabChange('home')} 
          />
          <NavItem 
            icon={<Camera />} 
            isActive={currentTab === 'scanner'} 
            onClick={() => onTabChange('scanner')} 
          />
          <NavItem 
            icon={<MessageSquare />} 
            isActive={currentTab === 'chat'} 
            onClick={() => onTabChange('chat')} 
          />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ icon, isActive, onClick }: { icon: React.ReactNode, isActive: boolean, onClick: () => void }) {
  return (
    <motion.button 
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      animate={{ scale: isActive ? 1.15 : 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`relative flex flex-col items-center justify-center p-2 transition-colors duration-300 ${
        isActive ? 'text-scan-primary' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement, { 
        className: `w-7 h-7 transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_10px_rgba(0,200,83,0.6)]' : ''}`,
        strokeWidth: isActive ? 2.5 : 2
      })}
      
      {/* Active Dot Indicator */}
      {isActive && (
        <motion.div 
          layoutId="activeTab"
          className="absolute -bottom-2 w-1.5 h-1.5 bg-scan-primary rounded-full shadow-[0_0_8px_rgba(0,200,83,1)]"
        />
      )}
    </motion.button>
  );
}
