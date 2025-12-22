/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // Override default colors - only these are allowed
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000000',
      white: '#FFFFFF',
      gray: {
        50: '#F9FAFB',
        100: '#F3F4F6',
        200: '#E5E7EB',
        300: '#D1D5DB',
        400: '#9CA3AF',
        500: '#6B7280',
        600: '#4B5563',
        700: '#374151',
        800: '#1F2937',
        900: '#111827',
      },
      // Purple accent colors
      purple: {
        500: '#652CC5',  // Deep purple
        100: '#D5C5F2',  // Light lavender
      },
      // Fish icon colors (extracted from playfish.io logo)
      lime: {
        50: '#ECFFE0',   // Very light mint
        100: '#D3F9BC',  // Light green
        200: '#CEFCB1',  // Soft mint
        300: '#AEC99D',  // Sage
        400: '#8EC76B',  // Medium green
        500: '#A8E61D',  // Bright lime (primary brand)
        600: '#76A854',  // Forest green
        700: '#56694A',  // Dark olive
        800: '#4D7037',  // Deep forest
      },
      green: {
        700: '#15803d',  // Dark green
        800: '#166534',  // Darker green
      },
      // User colors - unique dark pastels for auto-assigned user colors
      user: {
        mauve: '#8B6B7B',      // Dusty mauve
        slate: '#5E6B8A',      // Slate blue
        clay: '#9B7162',       // Terracotta clay
        teal: '#4A7C7C',       // Deep teal
        plum: '#7B5E7B',       // Muted plum
        ochre: '#9B8A5E',      // Dark ochre
        sage: '#6B7B62',       // Dark sage
        coral: '#9B6B6B',      // Dusty coral
        indigo: '#5E5E8A',     // Muted indigo
        wine: '#8A5E6B',       // Wine/burgundy
        bronze: '#8A7B5E',     // Bronze
        steel: '#6B7B8A',      // Steel blue
      },
      // Semantic aliases (for backwards compatibility with shadcn)
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      border: 'hsl(var(--border))',
      input: 'hsl(var(--input))',
      ring: 'hsl(var(--ring))',
      primary: {
        DEFAULT: 'hsl(var(--primary))',
        foreground: 'hsl(var(--primary-foreground))'
      },
      secondary: {
        DEFAULT: 'hsl(var(--secondary))',
        foreground: 'hsl(var(--secondary-foreground))'
      },
      muted: {
        DEFAULT: 'hsl(var(--muted))',
        foreground: 'hsl(var(--muted-foreground))'
      },
      destructive: {
        DEFAULT: 'hsl(var(--destructive))',
        foreground: 'hsl(var(--destructive-foreground))'
      },
      accent: {
        DEFAULT: 'hsl(var(--accent))',
        foreground: 'hsl(var(--accent-foreground))'
      },
      card: {
        DEFAULT: 'hsl(var(--card))',
        foreground: 'hsl(var(--card-foreground))'
      },
      popover: {
        DEFAULT: 'hsl(var(--popover))',
        foreground: 'hsl(var(--popover-foreground))'
      },
    },
    // Override default font sizes - only these are allowed
    fontSize: {
      'xs': ['0.75rem', { lineHeight: '1rem' }],       // 12px
      'sm': ['0.875rem', { lineHeight: '1.25rem' }],   // 14px
      'base': ['1rem', { lineHeight: '1.5rem' }],      // 16px
      'lg': ['1.125rem', { lineHeight: '1.75rem' }],   // 18px
      'xl': ['1.25rem', { lineHeight: '1.75rem' }],    // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem' }],       // 24px
    },
    // Override default font weights - only these are allowed
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
    },
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
}
