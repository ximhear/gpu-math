import { describe, it, expect } from 'vitest';
import { resolveTheme, theme3b1b, themeDark, themeLight, themeMinimal } from '../src/themes/builtins.js';
import { getAutoColor, DEFAULT_PALETTE } from '../src/themes/palettes.js';

describe('themes', () => {
  it('resolveTheme defaults to 3b1b', () => {
    const t = resolveTheme();
    expect(t).toBe(theme3b1b);
  });

  it('resolveTheme resolves string names', () => {
    expect(resolveTheme('dark')).toBe(themeDark);
    expect(resolveTheme('light')).toBe(themeLight);
    expect(resolveTheme('minimal')).toBe(themeMinimal);
    expect(resolveTheme('3b1b')).toBe(theme3b1b);
  });

  it('resolveTheme falls back to 3b1b for unknown name', () => {
    expect(resolveTheme('nonexistent')).toBe(theme3b1b);
  });

  it('resolveTheme passes through custom theme object', () => {
    const custom = {
      background: '#000',
      grid: { color: '#111', majorColor: '#222' },
      axis: { color: '#fff', labelColor: '#aaa' },
      palette: ['#f00'],
      font: { family: 'monospace', size: 12 },
    };
    expect(resolveTheme(custom)).toBe(custom);
  });

  it('all built-in themes have required fields', () => {
    for (const t of [theme3b1b, themeDark, themeLight, themeMinimal]) {
      expect(t.background).toBeTruthy();
      expect(t.grid.color).toBeTruthy();
      expect(t.grid.majorColor).toBeTruthy();
      expect(t.axis.color).toBeTruthy();
      expect(t.palette.length).toBeGreaterThan(0);
      expect(t.font.family).toBeTruthy();
      expect(t.font.size).toBeGreaterThan(0);
    }
  });
});

describe('getAutoColor', () => {
  it('returns palette colors in order', () => {
    expect(getAutoColor(0)).toBe(DEFAULT_PALETTE[0]);
    expect(getAutoColor(1)).toBe(DEFAULT_PALETTE[1]);
  });

  it('wraps around palette length', () => {
    expect(getAutoColor(DEFAULT_PALETTE.length)).toBe(DEFAULT_PALETTE[0]);
    expect(getAutoColor(DEFAULT_PALETTE.length + 1)).toBe(DEFAULT_PALETTE[1]);
  });
});
