/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import MainLayout from './components/MainLayout';
import Home from './components/Home';
import Scanner from './components/Scanner';
import Chat from './components/Chat';
import Settings from './components/Settings';
import History, { ScanHistoryItem } from './components/History';
import { FoodAnalysis } from './lib/gemini';
import { checkAndSendSmartNotifications, updateLastUseTime } from './lib/notifications';
import { supabase } from './lib/supabase';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [currentTab, setCurrentTab] = useState<'home' | 'scanner' | 'chat' | 'settings' | 'history'>('home');
  const [lastScan, setLastScan] = useState<FoodAnalysis | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<ScanHistoryItem | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const fetchSubscription = async (user: any) => {
      try {
        const { data } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        setIsPremium(data?.plan === 'premium');
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setIsPremium(false);
      }
    };

    // Check active session securely
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      
      if (user) {
        setIsAuthenticated(true);
        const rawName = user.email?.split('@')[0].split('.')[0] || 'Usuário';
        const capitalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        setUserName(capitalizedName);
        await fetchSubscription(user);
      }
      setIsInitializing(false);
    };
    
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        const rawName = session.user.email?.split('@')[0].split('.')[0] || 'Usuário';
        const capitalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        setUserName(capitalizedName);
        await fetchSubscription(session.user);
      } else {
        setIsAuthenticated(false);
        setIsPremium(false);
      }
    });

    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (hasSeenOnboarding) {
      setShowOnboarding(false);
    }
    
    const savedScan = localStorage.getItem('lastScan');
    if (savedScan) {
      try {
        setLastScan(JSON.parse(savedScan));
      } catch (e) {
        console.error("Failed to parse last scan");
      }
    }

    const savedHistory = localStorage.getItem('scanHistory');
    if (savedHistory) {
      try {
        setScanHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse scan history");
      }
    }

    // Notification Logic
    updateLastUseTime();
    checkAndSendSmartNotifications(false);

    return () => subscription.unsubscribe();
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  const handleScanComplete = (data: FoodAnalysis, image: string) => {
    setLastScan(data);
    localStorage.setItem('lastScan', JSON.stringify(data));

    const newItem: ScanHistoryItem = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      image,
      result: data
    };

    const newHistory = [newItem, ...scanHistory];
    setScanHistory(newHistory);
    localStorage.setItem('scanHistory', JSON.stringify(newHistory));

    // Trigger notification for recent scan
    checkAndSendSmartNotifications(true);
  };

  const handleResetOnboarding = () => {
    localStorage.removeItem('hasSeenOnboarding');
    setShowOnboarding(true);
    setCurrentTab('home');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-scan-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Auth 
        onAuthenticate={(name) => {
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('userName', name);
          setUserName(name);
          setIsAuthenticated(true);
        }} 
      />
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <MainLayout currentTab={currentTab} onTabChange={(tab) => {
      setCurrentTab(tab);
      if (tab !== 'history') setSelectedHistoryItem(null);
    }}>
      {currentTab === 'home' && <Home userName={userName} isPremium={isPremium} onScanClick={() => setCurrentTab('scanner')} onHistoryClick={() => setCurrentTab('history')} lastScan={lastScan} scanHistory={scanHistory} />}
      {currentTab === 'scanner' && <Scanner onScanComplete={handleScanComplete} />}
      {currentTab === 'chat' && <Chat />}
      {currentTab === 'settings' && <Settings onResetOnboarding={handleResetOnboarding} />}
      {currentTab === 'history' && !selectedHistoryItem && (
        <History history={scanHistory} onItemClick={setSelectedHistoryItem} isPremium={isPremium} />
      )}
      {currentTab === 'history' && selectedHistoryItem && (
        <div className="p-6">
          <button 
            onClick={() => setSelectedHistoryItem(null)}
            className="mb-4 text-scan-primary font-bold flex items-center gap-2"
          >
            ← Voltar ao Histórico
          </button>
          <Scanner onScanComplete={() => {}} initialData={selectedHistoryItem} />
        </div>
      )}
    </MainLayout>
  );
}

