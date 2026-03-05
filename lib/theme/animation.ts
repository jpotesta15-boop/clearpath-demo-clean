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

/** Modal enter/exit: slight scale + opacity. Use with AnimatePresence. */
export const modalTransition = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: {
    duration: tokens.animation.modal.durationMs / 1000,
    ease: SMOOTH_EASE,
  },
}

/** List stagger: use as container transition.staggerChildren (delay in s). */
export const listStaggerDelay = tokens.animation.listStaggerDelayMs / 1000

/** Variants for staggered list/card entrance (opacity + y). Respect prefers-reduced-motion in components. */
export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: listStaggerDelay,
      staggerDirection: 1,
    },
  },
}

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

