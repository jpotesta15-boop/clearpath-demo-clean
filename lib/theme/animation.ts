import { tokens } from "./tokens"

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: {
    duration: tokens.animation.page.durationMs / 1000,
    ease: tokens.animation.page.easing === "easeOut" ? "easeOut" : "easeInOut",
  },
}

export const cardHoverTransition = {
  hover: {
    y: -2,
    boxShadow: "var(--cp-shadow-card)",
  },
  transition: {
    duration: tokens.animation.cardHover.durationMs / 1000,
    ease: tokens.animation.cardHover.easing === "easeOut" ? "easeOut" : "easeInOut",
  },
}

