'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    loadClients()
  }, [])

  useEffect(() => {
    if (selectedClient && clients.length > 0) {
      loadMessages()
    }
  }, [selectedClient, clients])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadClients = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUser(user)

    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('coach_id', user.id)
      .order('full_name', { ascending: true })

    setClients(data || [])
    const clientFromUrl = searchParams.get('client')
    if (clientFromUrl && data?.some((c) => c.id === clientFromUrl)) {
      setSelectedClient(clientFromUrl)
    } else if (data && data.length > 0 && !selectedClient) {
      setSelectedClient(data[0].id)
    }
  }

  const loadMessages = async () => {
    if (!selectedClient || !currentUser) return

    const client = clients.find((c) => c.id === selectedClient)
    if (!client) return

    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', client.email)
      .maybeSingle()

    if (!clientProfile) {
      setMessages([])
      return
    }

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUser.id},recipient_id.eq.${clientProfile.id}),and(sender_id.eq.${clientProfile.id},recipient_id.eq.${currentUser.id})`
      )
      .order('created_at', { ascending: true })

    setMessages(data || [])
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient || !newMessage.trim() || !currentUser) return

    // Get client's profile ID
    const client = clients.find(c => c.id === selectedClient)
    if (!client) return

    // Find or create client profile
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', client.email)
      .single()

    if (clientProfile) {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUser.id,
          recipient_id: clientProfile.id,
          content: newMessage,
        })

      if (!error) {
        setNewMessage('')
        loadMessages()
      }
    }
  }

  const selectedClientData = clients.find((c) => c.id === selectedClient)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="mt-1 text-sm text-gray-500">Communicate with your clients</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-0">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-gray-900">Clients</h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
              {clients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClient(client.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    selectedClient === client.id
                      ? 'bg-blue-50 border-l-2 border-l-blue-600'
                      : ''
                  }`}
                >
                  <p className="font-medium text-gray-900">{client.full_name}</p>
                  {client.email && (
                    <p className="text-xs text-gray-500 truncate">{client.email}</p>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 flex flex-col min-h-[480px]">
          <Card className="border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
            {selectedClient ? (
              <>
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <p className="font-semibold text-gray-900">
                    {selectedClientData?.full_name ?? 'Client'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedClientData?.email ?? 'No email'}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                  <div className="space-y-3">
                    {messages.length === 0 && (
                      <p className="text-center text-gray-500 text-sm py-8">
                        No messages yet. Send one below.
                      </p>
                    )}
                    {messages.map((message) => {
                      const isOwn = message.sender_id === currentUser?.id
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] lg:max-w-md ${
                              isOwn ? 'items-end' : 'items-start'
                            }`}
                          >
                            {!isOwn && (
                              <p className="text-xs font-medium text-gray-500 mb-0.5">
                                {selectedClientData?.full_name ?? 'Client'}
                              </p>
                            )}
                            <div
                              className={`rounded-lg px-4 py-2.5 ${
                                isOwn
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900 border border-gray-200'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                              <p
                                className={`text-xs mt-1 ${
                                  isOwn ? 'text-blue-100' : 'text-gray-500'
                                }`}
                              >
                                {format(new Date(message.created_at), 'MMM d, h:mm a')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-gray-100 bg-gray-50/30"
                >
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button type="submit">
                      Send
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-gray-500 text-center">
                  Select a client from the list to view and send messages.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

