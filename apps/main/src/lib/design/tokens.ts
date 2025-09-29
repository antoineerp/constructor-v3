// Design tokens source of truth
// Extendable structure: semantic + primitive tokens
export const tokens = {
  version: 1,
  primitives: {
    color: {
      white: '#ffffff',
      black: '#000000',
      gray: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827'
      },
      blue: {
        50: '#eff6ff',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8'
      },
      purple: {
        50: '#faf5ff',
        500: '#8b5cf6',
        600: '#7c3aed',
        700: '#6d28d9'
      },
      red: { 500: '#ef4444', 600: '#dc2626' },
      emerald: { 500: '#10b981', 600: '#059669' }
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px',
      '2xl': '32px'
    },
    radius: {
      sm: '2px',
      md: '4px',
      lg: '8px',
      full: '9999px'
    },
    font: {
      family: {
        sans: "'Inter', system-ui, sans-serif",
        mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace"
      },
      size: {
        xs: '11px',
        sm: '13px',
        base: '15px',
        lg: '18px',
        xl: '22px'
      },
      weight: { regular: 400, medium: 500, semibold: 600, bold: 700 }
    },
    shadow: {
      sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
      md: '0 4px 10px -2px rgba(0,0,0,0.08)',
      lg: '0 8px 24px -4px rgba(0,0,0,0.12)'
    }
  },
  semantic: {
    color: {
      bg: 'var(--color-gray-50)',
      surface: 'var(--color-white)',
      text: 'var(--color-gray-800)',
      textDim: 'var(--color-gray-500)',
      primary: 'var(--color-blue-600)',
      primaryHover: 'var(--color-blue-500)',
      danger: 'var(--color-red-600)',
      success: 'var(--color-emerald-600)',
      border: 'var(--color-gray-200)'
    }
  },
  themes: {
    light: {},
    dark: {
      overrides: {
        '--color-bg': '#0f1115',
        '--color-surface': '#1b1f27',
        '--color-text': '#f5f7fa',
        '--color-text-dim': '#9ca3b5',
        '--color-border': '#2a303c'
      }
    }
  } as Record<ThemeName, Theme>
};

type ThemeName = 'light' | 'dark';

interface Theme {
  overrides?: Record<string, string>;
}

// Generate CSS custom properties from tokens
export function tokensToCss(vars = tokens) {
  const lines: string[] = [];
  // primitives colors flatten
  function walk(obj: Record<string, any>, path: string[] = []) {
    Object.entries(obj).forEach(([k, v]) => {
      const next = [...path, k];
      if (typeof v === 'object' && v && !Array.isArray(v)) walk(v, next);
      else if (typeof v === 'string' || typeof v === 'number') {
        const name = '--' + next.join('-');
        lines.push(`${name}: ${v};`);
      }
    });
  }
  // Map primitives.color into --color-*
  walk(vars.primitives.color, ['color']);
  // Spacing
  walk(vars.primitives.spacing, ['space']);
  walk(vars.primitives.radius, ['radius']);
  walk(vars.primitives.font.size, ['font-size']);
  // Semantic shortcuts -> générer variables --color-xxx
  Object.entries(vars.semantic.color).forEach(([k, val]) => {
    lines.push(`--color-${k}: ${val};`);
  });
  return `:root{\n${lines.join('\n')}\n}`;
}

export function themeOverrides(themeName: ThemeName) {
  const t = tokens.themes[themeName];
  if (!t || !t.overrides) return '';
  const pairs = Object.entries(t.overrides).map(([k, v]) => `${k}: ${v};`);
  return `[data-theme='${themeName}']{\n${pairs.join('\n')}\n}`;
}
