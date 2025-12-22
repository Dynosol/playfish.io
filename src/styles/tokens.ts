/**
 * Design Tokens
 *
 * This file defines all allowed colors and font sizes for the application.
 * Only these values should be used throughout the codebase.
 *
 * Usage in Tailwind classes:
 *   Colors: text-theme-primary, bg-theme-surface, border-theme-border, etc.
 *   Font sizes: text-xs, text-sm, text-base, text-lg, text-xl, text-2xl
 */

// =============================================================================
// COLORS
// =============================================================================

export const colors = {
  // Primary palette
  black: '#000000',
  white: '#FFFFFF',

  // Grays (for text, borders, backgrounds)
  gray: {
    50: '#F9FAFB',   // Lightest background
    100: '#F3F4F6',  // Light background
    200: '#E5E7EB',  // Borders
    300: '#D1D5DB',  // Disabled text
    400: '#9CA3AF',  // Muted text
    500: '#6B7280',  // Secondary text
    600: '#4B5563',  // Primary text (light mode)
    700: '#374151',  // Headings
    800: '#1F2937',  // Dark background
    900: '#111827',  // Darkest background
  },

  // Team colors
  red: {
    500: '#EF4444',  // Red team primary
    600: '#DC2626',  // Red team hover
  },

  blue: {
    500: '#3B82F6',  // Blue team primary
    600: '#2563EB',  // Blue team hover
  },

  // Status colors
  green: {
    500: '#22C55E',  // Success
    600: '#16A34A',  // Success hover
  },

  amber: {
    500: '#F59E0B',  // Warning/Host indicator
  },
} as const;

// =============================================================================
// FONT SIZES
// =============================================================================

export const fontSize = {
  xs: '0.75rem',     // 12px - timestamps, labels
  sm: '0.875rem',    // 14px - secondary text, buttons
  base: '1rem',      // 16px - body text
  lg: '1.125rem',    // 18px - subheadings
  xl: '1.25rem',     // 20px - section titles
  '2xl': '1.5rem',   // 24px - page titles
} as const;

// =============================================================================
// FONT WEIGHTS
// =============================================================================

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
} as const;

// =============================================================================
// SPACING (reference only - use Tailwind's default scale)
// =============================================================================

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  2: '0.5rem',      // 8px
  3: '0.75rem',     // 12px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  8: '2rem',        // 32px
} as const;

// =============================================================================
// SEMANTIC COLOR MAPPINGS
// =============================================================================

export const semanticColors = {
  // Backgrounds
  background: colors.white,
  surface: colors.white,
  surfaceHover: colors.gray[50],

  // Text
  textPrimary: colors.gray[900],
  textSecondary: colors.gray[500],
  textMuted: colors.gray[400],

  // Borders
  border: colors.gray[200],
  borderDark: colors.gray[300],

  // Interactive
  link: colors.black,

  // Teams
  teamRed: colors.red[500],
  teamRedHover: colors.red[600],
  teamBlue: colors.blue[500],
  teamBlueHover: colors.blue[600],

  // Status
  success: colors.green[500],
  warning: colors.amber[500],
} as const;

// Type exports for TypeScript usage
export type ColorToken = typeof colors;
export type FontSizeToken = typeof fontSize;
export type SemanticColorToken = typeof semanticColors;
