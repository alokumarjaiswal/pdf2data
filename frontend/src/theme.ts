// Minimal Professional Theme - Pitch Black & Shiny Grey with Intensity Modes
export const theme = {
  colors: {
    // Core theme colors - Only pitch black and shiny grey
    black: '#000000',
    grey: {
      100: '#ffffff', // Pure white for maximum shine
      200: '#f8f8f8', // Very bright shiny grey  
      300: '#e8e8e8', // Bright shiny grey
      400: '#d4d4d4', // Silver-like shiny grey
      500: '#c0c0c0', // Medium shiny grey
      600: '#a0a0a0', // Dark shiny grey
      700: '#808080', // Darker grey
      800: '#606060', // Very dark grey
      900: '#303030'  // Near black grey (brighter than before)
    },
    
    // Intensity mode variations
    modes: {
      stealth: {
        background: '#000000',
        surface: '#202020',
        border: '#404040',
        text: '#ffffff',
        textSecondary: '#f0f0f0',
        textMuted: '#d0d0d0'
      },
      comfort: {
        background: '#0a0a0a',
        surface: '#252525',
        border: '#454545',
        text: '#f5f5f5',
        textSecondary: '#e5e5e5',
        textMuted: '#c5c5c5'
      },
      ambient: {
        background: '#141414',
        surface: '#2a2a2a',
        border: '#4a4a4a',
        text: '#f0f0f0',
        textSecondary: '#e0e0e0',
        textMuted: '#c0c0c0'
      }
    },
    
    // Functional colors (minimal variants)
    success: '#808080',
    warning: '#a0a0a0', 
    error: '#606060',
    
    // Interface colors
    background: '#000000',
    surface: '#303030',
    border: '#606060',
    text: {
      primary: '#ffffff',    // Pure white for maximum shine
      secondary: '#f8f8f8',  // Very bright shiny grey
      muted: '#d4d4d4'       // Silver-like shine
    }
  },

  typography: {
    fontFamily: {
      primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      mono: '"JetBrains Mono", "Consolas", "Monaco", monospace'
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem', 
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem'
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75'
    }
  },

  spacing: {
    xs: '0.5rem',
    sm: '1rem', 
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    '2xl': '4rem'
  },

  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.25rem',
    lg: '0.375rem'
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.8)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.6)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
    text: '0 0 8px rgba(255, 255, 255, 0.3)' // Subtle text glow
  }
};

// Minimal utility classes for consistent styling with shiny effects
export const commonStyles = {
  // Cards - minimal and clean
  card: "bg-grey-900 border border-grey-800 p-6",
  cardHover: "bg-grey-900 border border-grey-800 p-6 hover:border-grey-700 transition-colors duration-200",
  
  // Buttons - minimal with subtle hover states and shiny text
  button: {
    primary: "bg-grey-800 hover:bg-grey-700 text-grey-100 font-medium px-6 py-3 border border-grey-700 transition-all duration-200 disabled:opacity-50 shiny-text",
    secondary: "bg-transparent hover:bg-grey-900 text-grey-300 font-medium px-6 py-3 border border-grey-600 transition-all duration-200 shiny-text",
    ghost: "bg-transparent hover:bg-grey-900 text-grey-400 font-medium px-4 py-2 transition-all duration-200 shiny-text"
  },
  
  // Inputs - clean and minimal with shiny text
  input: "w-full px-4 py-3 bg-black border border-grey-700 text-grey-100 focus:border-grey-500 transition-colors duration-200 placeholder-grey-500 shiny-text",
  label: "block text-sm font-medium text-grey-300 mb-2 shiny-text",
  
  // Typography - clean and professional with shine
  heading: {
    h1: "text-4xl font-bold text-grey-100 shiny-text-strong",
    h2: "text-3xl font-bold text-grey-100 shiny-text-strong", 
    h3: "text-2xl font-semibold text-grey-100 shiny-text",
    h4: "text-xl font-semibold text-grey-200 shiny-text"
  },
  
  // Status indicators - subtle with shine
  badge: {
    default: "inline-flex items-center px-3 py-1 text-sm font-medium bg-grey-800 text-grey-300 border border-grey-700 shiny-text",
    active: "inline-flex items-center px-3 py-1 text-sm font-medium bg-grey-700 text-grey-100 border border-grey-600 shiny-text"
  },
  
  // Alerts - minimal styling with shiny text
  alert: {
    info: "bg-grey-900 border border-grey-700 text-grey-200 p-4 shiny-text",
    success: "bg-grey-900 border border-grey-600 text-grey-100 p-4 shiny-text", 
    warning: "bg-grey-900 border border-grey-600 text-grey-200 p-4 shiny-text",
    error: "bg-grey-900 border border-grey-700 text-grey-300 p-4 shiny-text"
  },

  // Layout utilities with shiny text
  page: "min-h-screen bg-black text-grey-100 shiny-text",
  container: "max-w-7xl mx-auto px-6",
  section: "py-8",
  divider: "border-t border-grey-800",
  
  // Navigation with extra shine
  navLink: "text-sm font-medium transition-all duration-200 shiny-text-strong",
  navLinkActive: "text-grey-100 shiny-text-strong",
  navLinkInactive: "text-grey-400 hover:text-grey-200 shiny-text"
}; 