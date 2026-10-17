import React, { createContext, useContext, useEffect, useState } from 'react';
import { HistoryItem } from '../types/media';

interface HistoryContextType {
  history: HistoryItem[];
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'date'>) => void;
  removeHistoryItem: (id: string) => void;
  clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('mediaforge_history');
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is HistoryItem =>
            item && typeof item.id === 'string' && !['hist-1', 'hist-2'].includes(item.id) &&
            typeof item.inputFileName === 'string' && typeof item.outputFileName === 'string' &&
            typeof item.inputSize === 'number' && typeof item.outputSize === 'number' &&
            typeof item.inputFormat === 'string' && typeof item.outputFormat === 'string' &&
            typeof item.category === 'string' && typeof item.date === 'string' &&
            Number.isFinite(item.timestamp)
          ).slice(0, 50);
        }
      }
    } catch (e) {
      console.warn('History storage is unavailable', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('mediaforge_history', JSON.stringify(history));
    } catch (error) {
      console.warn('History could not be saved on this device', error);
    }
  }, [history]);

  const addHistoryItem = (item: Omit<HistoryItem, 'id' | 'timestamp' | 'date'>) => {
    const now = new Date();
    const newItem: HistoryItem = {
      ...item,
      id: 'hist-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      date: `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    };
    setHistory((prev) => [newItem, ...prev.slice(0, 49)]); // keep latest 50
  };

  const removeHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <HistoryContext.Provider value={{ history, addHistoryItem, removeHistoryItem, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = () => {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used within HistoryProvider');
  return ctx;
};
