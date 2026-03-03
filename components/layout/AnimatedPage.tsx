'use client'

import * as React from "react"
import { motion, type Transition } from "framer-motion"
import { pageTransition } from "@/lib/theme/animation"

export interface AnimatedPageProps {
  children: React.ReactNode
}

const MOTION_PAGE_TRANSITION: Transition = {
  duration: pageTransition.transition.duration,
  // Smooth, non-bouncy cubic-bezier easing
  ease: [0.16, 1, 0.3, 1],
}

export function AnimatedPage({ children }: AnimatedPageProps) {
  return (
    <motion.div
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      exit={pageTransition.exit}
      transition={MOTION_PAGE_TRANSITION}
    >
      {children}
    </motion.div>
  )
}

