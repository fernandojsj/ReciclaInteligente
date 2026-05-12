import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE_TEMA = '@recicla:tema';

export type Modo = 'dark' | 'light';

export interface Cores {
  bg: string;
  card: string;
  cardBorder: string;
  primary: string;
  primaryDim: string;
  primaryGlow: string;
  primaryBorder: string;
  primarySurface: string;
  text: string;
  textMuted: string;
  textBody: string;
  textLabel: string;
  error: string;
  errorSurface: string;
  cardBg: string;
  elevatedBg: string;
  surface: string;
  handleBar: string;
}

export const DARK: Cores = {
  bg: '#070e09',
  card: 'rgba(255,255,255,0.04)',
  cardBorder: 'rgba(255,255,255,0.07)',
  primary: '#1aff8c',
  primaryDim: 'rgba(26,255,140,0.1)',
  primaryGlow: 'rgba(26,255,140,0.18)',
  primaryBorder: 'rgba(26,255,140,0.2)',
  primarySurface: 'rgba(26,255,140,0.06)',
  text: '#e8f5ee',
  textMuted: 'rgba(232,245,238,0.38)',
  textBody: 'rgba(232,245,238,0.65)',
  textLabel: 'rgba(232,245,238,0.28)',
  error: '#ff4d6d',
  errorSurface: 'rgba(255,77,109,0.1)',
  cardBg: 'rgba(7,14,9,0.97)',
  elevatedBg: '#0d1a10',
  surface: 'rgba(255,255,255,0.025)',
  handleBar: 'rgba(255,255,255,0.12)',
};

export const LIGHT: Cores = {
  bg: '#f2f9f4',
  card: 'rgba(0,0,0,0.04)',
  cardBorder: 'rgba(0,0,0,0.09)',
  primary: '#0d9e5a',
  primaryDim: 'rgba(13,158,90,0.1)',
  primaryGlow: 'rgba(13,158,90,0.18)',
  primaryBorder: 'rgba(13,158,90,0.25)',
  primarySurface: 'rgba(13,158,90,0.08)',
  text: '#071a0d',
  textMuted: 'rgba(7,26,13,0.45)',
  textBody: 'rgba(7,26,13,0.65)',
  textLabel: 'rgba(7,26,13,0.32)',
  error: '#c62828',
  errorSurface: 'rgba(198,40,40,0.1)',
  cardBg: 'rgba(242,249,244,0.98)',
  elevatedBg: '#ffffff',
  surface: 'rgba(0,0,0,0.03)',
  handleBar: 'rgba(0,0,0,0.1)',
};

interface ThemeCtx {
  modo: Modo;
  C: Cores;
  toggleModo: () => void;
}

const ThemeContext = createContext<ThemeCtx>({ modo: 'dark', C: DARK, toggleModo: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [modo, setModo] = useState<Modo>('dark');

  useEffect(() => {
    AsyncStorage.getItem(CHAVE_TEMA).then(v => {
      if (v === 'light' || v === 'dark') setModo(v);
    });
  }, []);

  function toggleModo() {
    const novo: Modo = modo === 'dark' ? 'light' : 'dark';
    setModo(novo);
    AsyncStorage.setItem(CHAVE_TEMA, novo);
  }

  return (
    <ThemeContext.Provider value={{ modo, C: modo === 'dark' ? DARK : LIGHT, toggleModo }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
