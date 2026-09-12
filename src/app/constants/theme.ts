/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 */

import '../global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111827',
    background: '#F7F7FC',
    backgroundElement: '#EEEFFD',
    backgroundSelected: '#E0E4FF',
    textSecondary: '#6B7280',
    accent: '#4F6BFF',
  },
  dark: {
    text: '#F9FAFB',
    background: '#0B0B10',
    backgroundElement: '#1C1C24',
    backgroundSelected: '#26263A',
    textSecondary: '#9CA3AF',
    accent: '#6C87FF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;