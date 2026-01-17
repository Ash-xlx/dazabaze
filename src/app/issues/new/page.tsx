import { Suspense } from 'react'
import IssueEditor from '@/components/IssueEditor'

export default function NewIssuePage() {
  return (
    <Suspense fallback={null}>
      <IssueEditor mode="new" />
    </Suspense>
  )
}

