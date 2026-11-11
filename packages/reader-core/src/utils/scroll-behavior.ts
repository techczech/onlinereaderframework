/** Scroll behaviour for script-driven scrolling: 'smooth' unless the reader asked the system for reduced motion.
 * An explicit `behavior: 'smooth'` ignores the CSS `scroll-behavior` override, so every smooth scroll goes through here. */
export function scrollBehavior(): ScrollBehavior {
  try {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  } catch {
    return 'smooth';
  }
}
