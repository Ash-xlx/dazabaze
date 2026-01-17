import IssueEditor from '@/components/IssueEditor'

export default async function IssueDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <IssueEditor mode="existing" id={id} />
}

