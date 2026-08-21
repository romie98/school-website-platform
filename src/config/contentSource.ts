/** Static frontend seed is for local UI work only — never live staging/production content. */
export function allowSeedFallback() {
  return Boolean(import.meta.env.DEV) && import.meta.env.VITE_USE_LIVE_CONTENT !== 'true'
}
