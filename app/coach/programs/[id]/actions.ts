'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function reorderProgramLessonsAction(
  programId: string,
  lessonIdsInOrder: string[]
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: program } = await supabase
    .from('programs')
    .select('id')
    .eq('id', programId)
    .eq('coach_id', user.id)
    .single()
  if (!program) return { error: 'Program not found' }

  for (let i = 0; i < lessonIdsInOrder.length; i++) {
    const { error } = await supabase
      .from('program_lessons')
      .update({ sort_order: i })
      .eq('id', lessonIdsInOrder[i])
      .eq('program_id', programId)
    if (error) return { error: error.message }
  }

  revalidatePath(`/coach/programs/${programId}`)
  return {}
}
