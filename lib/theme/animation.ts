import { tokens } from "./tokens"

// Cubic-bezier easing tuned for smooth, non-bouncy motion
const SMOOTH_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: {
    duration: tokens.animation.page.durationMs / 1000,
    ease: SMOOTH_EASE,
  },
}

export const cardHoverTransition = {
  hover: {
    y: -2,
    boxShadow: "var(--cp-shadow-card)",
  },
  transition: {
    duration: tokens.animation.cardHover.durationMs / 1000,
    ease: SMOOTH_EASE,
  },
}

