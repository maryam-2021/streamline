// Shared StreamLine design tokens (mirrors web CSS variables)
export const palette = {
  teal: '#0d9488',
  fuchsia: '#c026d3',
};

export type Theme = {
  background: string;
  card: string;
  foreground: string;
  muted: string;
  border: string;
  primary: string;
  primaryFg: string;
  accent: string;
};

export const light: Theme = {
  background: '#fafafa',
  card: '#ffffff',
  foreground: '#042f2e',
  muted: '#5c7a78',
  border: '#ccf5f0',
  primary: palette.teal,
  primaryFg: '#ffffff',
  accent: palette.fuchsia,
};

export const dark: Theme = {
  background: '#021413',
  card: '#052e2b',
  foreground: '#c8f5ef',
  muted: '#8fbcb7',
  border: '#0b3f3b',
  primary: '#14b8a6',
  primaryFg: '#ffffff',
  accent: '#d946ef',
};

export const radius = { xl: 16, xxl: 24 };
export const spacing = (n: number) => n * 4;
