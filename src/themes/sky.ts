export function isSkyTheme(theme?: { theme?: string; navbarStyle?: string } | null) {
  return theme?.theme === 'sky' || theme?.navbarStyle === 'light'
}
