/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        /** Editorial / luxury display — pair with `font-sans` on the same page for UI body copy */
        display: ['"Cormorant Garamond"', 'Georgia', 'Times New Roman', 'serif'],
      },
      borderRadius: {
        none: '0',
        /** Shared curvature — bumped from Tailwind defaults for a softer creator UI */
        sm: 'calc(var(--radius) - 10px)',
        DEFAULT: 'calc(var(--radius) - 8px)',
        md: 'calc(var(--radius) - 6px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 10px)',
        '2xl': 'calc(var(--radius) + 18px)',
        '3xl': 'calc(var(--radius) + 28px)',
        full: '9999px',
      },
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
