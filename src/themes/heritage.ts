export const HERITAGE_TOKENS = {
  gold: '#FFD400',
  deepGold: '#C99A00',
  brown: '#4A3500',
  brownDark: '#241A00',
  cream: '#FFF9E8',
  white: '#FFFFFF',
  muted: '#5C4A2A',
  headingFont: 'Playfair Display',
  bodyFont: 'Inter',
  radius: '0.125rem',
  heroStyle: 'cinematic',
  navbarStyle: 'heritage',
  newsLayout: 'editorial',
  eventsLayout: 'date-list',
  footerStyle: 'heritage',
} as const

export function isHeritageTheme(theme?: { theme?: string; navbarStyle?: string; footerStyle?: string } | null) {
  return theme?.theme === 'heritage' || theme?.navbarStyle === 'heritage' || theme?.footerStyle === 'heritage'
}
