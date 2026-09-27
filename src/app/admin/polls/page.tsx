import Link from "next/link"
import { Plus } from "lucide-react"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { PollList } from "@/components/poll-list"

export const metadata = { title: "Polls" }

export default async function PollsAdminPage() {
  await requireRole("EDITOR")

  const polls = await db.poll.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      question: true,
      status: true,
      anonymous: true,
      multiChoice: true,
      endsAt: true,
      createdAt: true,
      _count: { select: { votes: true } },
    },
  })

  return (
    <>
      <PageHeader
        title="Polls"
        action={
          <Button render={<Link href="/admin/polls/new" />}>
            <Plus className="size-4" aria-hidden />
            New poll
          </Button>
        }
      />
      <PollList polls={polls} />
    </>
  )
}
