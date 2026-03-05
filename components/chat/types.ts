export type SessionOfferData = {
  type: 'session_offer'
  session_request_id?: string
  product_name?: string
  amount_cents?: number
  amount_display?: string
}

export type ChatMessage = {
  id: string
  content: string
  createdAt: string
  isOwn: boolean
  senderLabel?: string
  offer?: SessionOfferData | null
}

