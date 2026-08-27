import { requireRole } from "@/lib/rbac"
import { EditorHeader } from "@/components/editor-header"
import { PollForm } from "@/components/poll-form"

export const metadata = { title: "New Poll" }

export default async function NewPollPage() {
  await requireRole("EDITOR")
  return (
    <>
      <EditorHeader backHref="/admin/polls" backLabel="Polls" title="New poll" />
      <PollForm />
    </>
  )
}
