export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        black: '#000000',
        white: '#ffffff',
        grey: {
          100: '#ffffff',
          200: '#f8f8f8',
          300: '#e8e8e8',
          400: '#c0c0c0',
          500: '#a0a0a0',
          600: '#808080',
          700: '#606060',
          800: '#404040',
          900: '#202020'
        }
      },
      fontFamily: {
        'sans': ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
        'mono': ['"JetBrains Mono"', '"Consolas"', '"Monaco"', 'monospace']
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem', 
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem'
      },
      animation: {
        'shiny-shimmer': 'shiny-shimmer 3s ease-in-out infinite',
        'shiny-shimmer-strong': 'shiny-shimmer-strong 4s ease-in-out infinite'
      },
      keyframes: {
        'shiny-shimmer': {
          '0%': { 'background-position': '0% 0%' },
          '50%': { 'background-position': '100% 100%' },
          '100%': { 'background-position': '0% 0%' }
        },
        'shiny-shimmer-strong': {
          '0%': { 'background-position': '0% 0%' },
          '25%': { 'background-position': '50% 50%' },
          '50%': { 'background-position': '100% 100%' },
          '75%': { 'background-position': '50% 50%' },
          '100%': { 'background-position': '0% 0%' }
        }
      }
    },
  },
  plugins: [],
}
