'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ChatMessage } from './types'

type MessageContext = 'coach' | 'client'

interface MessageBubbleProps {
  message: ChatMessage
  context: MessageContext
}

export function MessageBubble({ message, context }: MessageBubbleProps) {
  const { isOwn, senderLabel, offer, content, createdAt } = message
  const timestamp = format(new Date(createdAt), 'MMM d, h:mm a')

  const isCoachView = context === 'coach'

  if (offer) {
    const amountDisplay =
      offer.amount_display ??
      ((offer.amount_cents ?? 0) / 100).toFixed(2)

    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[85%] lg:max-w-md">
          {!isOwn && senderLabel && (
            <p className="text-xs font-medium text-[var(--cp-text-muted)] mb-0.5">
              {senderLabel}
            </p>
          )}
          <div
            className={`rounded-lg px-4 py-3 border ${
              isOwn
                ? isCoachView
                  ? 'bg-[var(--cp-accent-primary-soft)] border-[var(--cp-accent-primary)] text-[var(--cp-text-primary)]'
                  : 'bg-[var(--cp-bg-elevated)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]'
                : 'bg-[var(--cp-bg-elevated)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]'
            }`}
          >
            <p className="text-xs font-medium text-[var(--cp-text-muted)] mb-1">
              {isCoachView ? 'Session offer' : 'Session offer from coach'}
            </p>
            <p className="text-sm font-semibold">
              {offer.product_name ?? 'Session'}
            </p>
            <p className="text-sm">${amountDisplay}</p>
            <p className="text-xs text-[var(--cp-text-muted)] mt-2">
              {isCoachView
                ? 'Client can respond in Messages or Schedule.'
                : 'Respond using the offer actions in your Schedule.'}
            </p>
            {!isCoachView && (
              <div className="mt-3">
                <Link
                  href="/client/schedule"
                  className="inline-flex items-center rounded-md bg-[var(--cp-accent-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--cp-text-on-accent)] hover:bg-[var(--cp-accent-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
                >
                  View &amp; pay in Schedule
                </Link>
              </div>
            )}
            <p className="text-xs mt-2 opacity-80">{timestamp}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[85%] lg:max-w-md">
        {!isOwn && senderLabel && (
          <p className="text-xs font-medium text-[var(--cp-text-muted)] mb-0.5">
            {senderLabel}
          </p>
        )}
        <div
          className={`rounded-lg px-4 py-2.5 ${
            isOwn
              ? 'bg-[var(--cp-accent-primary)] text-[var(--cp-text-on-accent)]'
              : isCoachView
                ? 'bg-[rgba(15,23,42,0.8)] text-[var(--cp-text-primary)] border border-[var(--cp-border-subtle)]'
                : 'bg-[var(--cp-bg-elevated)] text-[var(--cp-text-primary)] border border-[var(--cp-border-subtle)]'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {content}
          </p>
          <p
            className={`text-xs mt-1 ${
              isOwn
                ? 'opacity-80'
                : isCoachView
                  ? 'text-[var(--cp-text-subtle)]'
                  : 'text-[var(--cp-text-muted)]'
            }`}
          >
            {timestamp}
          </p>
        </div>
      </div>
    </div>
  )
}

