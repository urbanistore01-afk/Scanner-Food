import React, { useEffect } from 'react';
import { Home, Camera, MessageSquare, Settings as SettingsIcon } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col bg-bg-base text-text-base transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-bg-base/80 backdrop-blur-md border-b border-border-base">
        <div className="flex items-center justify-between px-6 py-3 max-w-md mx-auto w-full">
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

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto pb-24 relative">
        {children}
      </main>

      {/* Bottom Navbar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface-base border-t border-border-base pb-4">
        <div className="flex justify-around items-center max-w-md mx-auto w-full px-6 py-3">
          <NavItem 
            icon={<Home />} 
            label="Home" 
            isActive={currentTab === 'home'} 
            onClick={() => onTabChange('home')} 
          />
          <div className="relative -top-6">
            <button
              onClick={() => onTabChange('scanner')}
              className={`p-4 rounded-full shadow-xl transition-transform ${
                currentTab === 'scanner' 
                  ? 'bg-invert-bg text-invert-text scale-110' 
                  : 'bg-scan-primary text-white hover:bg-scan-primary-hover'
              }`}
            >
              <Camera className="w-7 h-7" />
            </button>
          </div>
          <NavItem 
            icon={<MessageSquare />} 
            label="Chat" 
            isActive={currentTab === 'chat'} 
            onClick={() => onTabChange('chat')} 
          />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 transition-colors ${
        isActive ? 'text-scan-primary' : 'text-text-base/50 hover:text-text-base'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
