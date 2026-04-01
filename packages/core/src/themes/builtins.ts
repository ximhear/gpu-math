import type { Theme } from '../types.js';

export const theme3b1b: Theme = {
  background: '#1c1c1c',
  grid: { color: '#333333', majorColor: '#555555' },
  axis: { color: '#ffffff', labelColor: '#aaaaaa' },
  palette: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
  font: { family: 'system-ui', size: 14 },
};

export const themeDark: Theme = {
  background: '#0a0a0a',
  grid: { color: '#1a1a2e', majorColor: '#2a2a4e' },
  axis: { color: '#e0e0e0', labelColor: '#888888' },
  palette: ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#f472b6'],
  font: { family: 'system-ui', size: 14 },
};

export const themeLight: Theme = {
  background: '#ffffff',
  grid: { color: '#e5e7eb', majorColor: '#d1d5db' },
  axis: { color: '#374151', labelColor: '#6b7280' },
  palette: ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777'],
  font: { family: 'system-ui', size: 14 },
};

export const themeMinimal: Theme = {
  background: '#fafafa',
  grid: { color: '#f0f0f0', majorColor: '#e0e0e0' },
  axis: { color: '#999999', labelColor: '#bbbbbb' },
  palette: ['#333333', '#666666', '#999999', '#444444', '#777777', '#aaaaaa'],
  font: { family: 'system-ui', size: 13 },
};

export const builtinThemes: Record<string, Theme> = {
  '3b1b': theme3b1b,
  dark: themeDark,
  light: themeLight,
  minimal: themeMinimal,
};

export function resolveTheme(input?: string | Theme): Theme {
  if (!input) return theme3b1b;
  if (typeof input === 'string') return builtinThemes[input] ?? theme3b1b;
  return input;
}
