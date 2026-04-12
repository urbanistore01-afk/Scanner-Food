/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Onboarding from './components/Onboarding';
import MainLayout from './components/MainLayout';
import Home from './components/Home';
import Scanner from './components/Scanner';
import Chat from './components/Chat';
import Settings from './components/Settings';
import History, { ScanHistoryItem } from './components/History';
import { FoodAnalysis } from './lib/gemini';
import { checkAndSendSmartNotifications, updateLastUseTime } from './lib/notifications';

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [currentTab, setCurrentTab] = useState<'home' | 'scanner' | 'chat' | 'settings' | 'history'>('home');
  const [lastScan, setLastScan] = useState<FoodAnalysis | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<ScanHistoryItem | null>(null);

  useEffect(() => {
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

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <MainLayout currentTab={currentTab} onTabChange={(tab) => {
      setCurrentTab(tab);
      if (tab !== 'history') setSelectedHistoryItem(null);
    }}>
      {currentTab === 'home' && <Home onScanClick={() => setCurrentTab('scanner')} onHistoryClick={() => setCurrentTab('history')} lastScan={lastScan} />}
      {currentTab === 'scanner' && <Scanner onScanComplete={handleScanComplete} />}
      {currentTab === 'chat' && <Chat />}
      {currentTab === 'settings' && <Settings onResetOnboarding={handleResetOnboarding} />}
      {currentTab === 'history' && !selectedHistoryItem && (
        <History history={scanHistory} onItemClick={setSelectedHistoryItem} />
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

