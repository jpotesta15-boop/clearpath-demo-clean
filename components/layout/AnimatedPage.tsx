'use client'

import * as React from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence, type Transition } from "framer-motion"
import { pageTransition } from "@/lib/theme/animation"
import { useReducedMotion } from "@/lib/use-reduced-motion"

export interface AnimatedPageProps {
  children: React.ReactNode
}

const MOTION_PAGE_TRANSITION: Transition = {
  duration: pageTransition.transition.duration,
  ease: [0.16, 1, 0.3, 1],
}

const REDUCED_TRANSITION: Transition = { duration: 0 }

export function AnimatedPage({ children }: AnimatedPageProps) {
  const reducedMotion = useReducedMotion()
  const transition = reducedMotion ? REDUCED_TRANSITION : MOTION_PAGE_TRANSITION
  const initial = reducedMotion ? pageTransition.animate : pageTransition.initial
  const exit = reducedMotion ? pageTransition.animate : pageTransition.exit

  return (
    <motion.div
      initial={initial}
      animate={pageTransition.animate}
      exit={exit}
      transition={transition}
    >
      {children}
    </motion.div>
  )
}

/** Wraps children in AnimatePresence so page exit runs on route change. Use in layout. */
export function AnimatedPageWithExit({ children }: AnimatedPageProps) {
  const pathname = usePathname()
  return (
    <AnimatePresence mode="wait">
      <AnimatedPage key={pathname}>{children}</AnimatedPage>
    </AnimatePresence>
  )
}

