import { requireRole } from "@/lib/rbac"
import { PageHeader } from "@/components/ui/page-header"
import { PollForm } from "@/components/poll-form"

export const metadata = { title: "New Poll" }

export default async function NewPollPage() {
  await requireRole("EDITOR")
  return (
    <>
      <PageHeader title="New poll" />
      <PollForm />
    </>
  )
}
