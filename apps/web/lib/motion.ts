/** Shared motion tokens — align with design-system 150–300ms transitions */
export const MOTION_DURATION_MS = 200;
export const MOTION_EASE = 'cubic-bezier(0.33, 1, 0.68, 1)';

export function staggerDelay(index: number, baseMs = 60, maxMs = 360): number {
  return Math.min(index * baseMs, maxMs);
}

export const motionClassNames = {
  interactive: 'transition-interactive',
  cardLift: 'card-lift',
  ctaPrimary: 'cta-primary',
  navLink: 'nav-link-indicator',
  reveal: 'reveal',
  revealVisible: 'is-visible',
  inputFocus: 'input-focus-ring',
  errorShake: 'error-shake',
} as const;
