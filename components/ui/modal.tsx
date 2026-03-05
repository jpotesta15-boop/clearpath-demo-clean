'use client'

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { modalTransition } from "@/lib/theme/animation"
import { cn } from "@/lib/utils"

export interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  /** Optional class for the inner panel (not the backdrop). */
  className?: string
  /** Prevent close on backdrop click when true (e.g. submitting). */
  preventClose?: boolean
}

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function Modal({ open, onClose, children, className, preventClose }: ModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const previousActiveElement = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    previousActiveElement.current = document.activeElement as HTMLElement | null
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [open, onClose])

  React.useEffect(() => {
    if (!open) return
    const focusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    if (focusable) {
      const t = requestAnimationFrame(() => focusable.focus())
      return () => cancelAnimationFrame(t)
    }
  }, [open])

  React.useEffect(() => {
    if (!open && previousActiveElement.current?.focus) {
      previousActiveElement.current.focus()
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.current) return
    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  if (typeof document === "undefined") return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--cp-bg-backdrop)] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: modalTransition.transition.duration, ease: modalTransition.transition.ease }}
            onClick={() => !preventClose && onClose()}
            aria-modal="true"
            role="dialog"
          >
            <motion.div
              ref={panelRef}
              className={cn(
                "rounded-lg border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] shadow-[var(--cp-shadow-elevated)] max-w-md w-full max-h-[90vh] overflow-y-auto",
                className
              )}
              initial={modalTransition.initial}
              animate={modalTransition.animate}
              exit={modalTransition.exit}
              transition={modalTransition.transition}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleKeyDown}
            >
              {children}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
