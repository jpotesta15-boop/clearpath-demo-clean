'use client'

import dynamic from 'next/dynamic'
import { PageSkeleton } from '@/components/ui/PageSkeleton'

const ProgramDetailClient = dynamic(() => import('./ProgramDetailClient'), {
  loading: () => <PageSkeleton />,
  ssr: false,
})

export function ProgramDetailDynamic() {
  return <ProgramDetailClient />
}
