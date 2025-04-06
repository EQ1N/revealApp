export const colors = {
  // Base colors
  background: '#061708', // Dark green background
  surface: '#0F241A', // Slightly lighter dark green
  surfaceLight: '#182F24', // Even lighter dark green
  surfaceDisabled: '#0F241A',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.9)',
  textTertiary: 'rgba(255, 255, 255, 0.7)',
  textDisabled: 'rgba(255, 255, 255, 0.5)',
  
  // Brand colors
  primary: '#AAFF54', // Neon green
  primaryLight: 'rgba(170, 255, 84, 0.2)', // Neon green with transparency
  primaryDark: '#90E042', // Darker neon green
  
  // Utility colors
  overlay: 'rgba(6, 23, 8, 0.7)',
  divider: 'rgba(255, 255, 255, 0.1)',
  error: '#FF6B6B',
  success: '#4ECDC4',
  warning: '#FFD166',
  info: '#6ECFFF',
  
  // Specific use cases
  cardBackground: '#0F241A',
  headerBlur: 'rgba(15, 36, 26, 0.7)',
  toggleBackground: 'rgba(24, 47, 36, 0.8)',
  inputBackground: '#182F24',
  buttonDisabled: 'rgba(255, 255, 255, 0.12)',
  
  // Shadows
  shadowColor: '#000000',
  shadowOpacity: 0.5,
  
  // Glassmorphism
  glass: {
    background: 'rgba(15, 36, 26, 0.5)',
    border: 'rgba(255, 255, 255, 0.1)',
    highlight: 'rgba(255, 255, 255, 0.05)',
    shadow: 'rgba(0, 0, 0, 0.5)',
    blurRadius: 15,
  },
  
  // Gradients
  gradients: {
    primary: ['#AAFF54', '#79BD47'], // Neon green to darker green
    dark: ['#0F241A', '#061708'], // Surface to background
    glow: ['rgba(170, 255, 84, 0.8)', 'rgba(170, 255, 84, 0)'], // Neon green glow effect
    glass: ['rgba(15, 36, 26, 0.8)', 'rgba(6, 23, 8, 0.5)'], // Glass effect gradient
  },
} as const;

export type ColorKeys = keyof typeof colors; 