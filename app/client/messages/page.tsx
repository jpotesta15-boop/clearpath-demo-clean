'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'

export default function ClientMessagesPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [coach, setCoach] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [clientNotFound, setClientNotFound] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUser(user)

    const { data: client } = await supabase
      .from('clients')
      .select('*, coach:profiles!clients_coach_id_fkey(*)')
      .eq('email', user.email)
      .single()

    if (!client) {
      setClientNotFound(true)
      return
    }

    setCoach(client.coach)

    const { data: coachProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', client.coach_id)
      .single()

    if (coachProfile) {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${coachProfile.id}),and(sender_id.eq.${coachProfile.id},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true })

      setMessages(data || [])
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !coach || !currentUser) return

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUser.id,
        recipient_id: coach.id,
        content: newMessage,
      })

    if (!error) {
      setNewMessage('')
      loadData()
    }
  }

  if (clientNotFound) {
    return (
      <div className="space-y-4 max-w-md">
        <h1 className="text-2xl font-bold text-[var(--cp-text-primary)]">Client not found</h1>
        <p className="text-[var(--cp-text-muted)]">
          There is no client record for this account. Contact your coach to be added and to receive a portal invite.
        </p>
        <a
          href="/login"
          className="inline-flex items-center justify-center rounded-md font-medium px-4 py-2 bg-[var(--cp-accent-primary)] text-[var(--cp-text-on-accent)] hover:bg-[var(--cp-accent-primary-strong)]"
        >
          Back to login
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="mt-1 text-sm text-gray-500">Chat with your coach</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <h3 className="font-semibold">{coach?.full_name || 'Coach'}</h3>
          </div>
          <div className="p-4 border-b max-h-96 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwn = message.sender_id === currentUser?.id
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isOwn
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p>{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        isOwn ? 'text-primary-100' : 'text-gray-500'
                      }`}>
                        {format(new Date(message.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <form onSubmit={handleSendMessage} className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button type="submit">Send</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

