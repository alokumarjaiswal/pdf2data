import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'stealth' | 'comfort' | 'ambient';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('stealth');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('pdf2data-theme-mode') as ThemeMode;
    if (savedMode && ['stealth', 'comfort', 'ambient'].includes(savedMode)) {
      setModeState(savedMode);
    }
  }, []);

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('pdf2data-theme-mode', newMode);
  };

  const cycleMode = () => {
    const modes: ThemeMode[] = ['stealth', 'comfort', 'ambient'];
    const currentIndex = modes.indexOf(mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode, cycleMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
