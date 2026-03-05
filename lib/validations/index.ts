import { z } from 'zod'

const emailSchema = z.string().email().max(255).transform((s) => s.trim().toLowerCase())

export const createClientAccountSchema = z.object({
  email: emailSchema,
})

export const inviteClientSchema = z.object({
  email: emailSchema,
})

export const n8nSessionBookedSchema = z.object({
  session_id: z.string().min(1, 'session_id is required'),
  coach_id: z.string().uuid('coach_id must be a valid UUID'),
  client_id: z.string().uuid('client_id must be a valid UUID'),
  scheduled_time: z.string().min(1, 'scheduled_time is required'),
})

const urlSchema = z.string().url().refine((s) => s.startsWith('http://') || s.startsWith('https://'), {
  message: 'url must start with http:// or https://',
})

export const n8nVideoSchema = z.object({
  title: z.string().min(1, 'title is required').max(500).transform((s) => s.trim()),
  url: urlSchema,
  description: z.string().max(2000).optional().transform((s) => (s?.trim() || undefined)),
  category: z.string().max(100).optional().transform((s) => (s?.trim() || undefined)),
  coach_id: z.string().uuid().optional(),
})

export const bulkClientIdsSchema = z.object({
  clientIds: z.array(z.string().uuid()).min(1, 'At least one client is required').max(50),
})

export const bulkUpdateNamesSchema = z.object({
  clientIds: z.array(z.string().uuid()).min(1).max(50),
  fullName: z.string().min(1).max(200).transform((s) => s.trim() || 'Unnamed'),
})

export const clientIdSchema = z.string().uuid()
export const updateClientProfileSchema = z.object({
  height: z.string().max(50).nullable().optional(),
  weight_kg: z.number().nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
})

export const reorderLessonsSchema = z.object({
  programId: z.string().uuid(),
  lessonIdsInOrder: z.array(z.string().uuid()).min(1),
})

export type CreateClientAccountInput = z.infer<typeof createClientAccountSchema>
export type InviteClientInput = z.infer<typeof inviteClientSchema>
export type N8nSessionBookedInput = z.infer<typeof n8nSessionBookedSchema>
export type N8nVideoInput = z.infer<typeof n8nVideoSchema>
