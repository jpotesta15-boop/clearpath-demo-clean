'use client'

import { format } from 'date-fns'
import { MessageBubble } from './MessageBubble'
import type { ChatMessage } from './types'

type MessageContext = 'coach' | 'client'

interface MessageThreadProps {
  messages: ChatMessage[]
  context: MessageContext
  bottomRef?: React.RefObject<HTMLDivElement>
}

export function MessageThread({
  messages,
  context,
  bottomRef,
}: MessageThreadProps) {
  let lastDateKey: string | null = null

  return (
    <div className="space-y-3">
      {messages.map((message) => {
        const created = new Date(message.createdAt)
        const dateKey = format(created, 'yyyy-MM-dd')
        const showDateDivider = dateKey !== lastDateKey
        lastDateKey = dateKey

        return (
          <div key={message.id}>
            {showDateDivider && (
              <div className="mb-2 flex justify-center">
                <span className="rounded-full bg-[var(--cp-bg-subtle)] px-3 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--cp-text-subtle)]">
                  {format(created, 'MMM d, yyyy')}
                </span>
              </div>
            )}
            <MessageBubble message={message} context={context} />
          </div>
        )
      })}
      {bottomRef && <div ref={bottomRef} />}
    </div>
  )
}

export type { ChatMessage } from './types'

