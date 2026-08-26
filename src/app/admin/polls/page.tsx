import Link from "next/link"
import { Plus } from "lucide-react"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { PageHeader } from "@/components/ui/page-header"
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
          <Link
            href="/admin/polls/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white transition hover:brightness-95 active:brightness-90"
          >
            <Plus className="size-4" aria-hidden />
            New poll
          </Link>
        }
      />
      <PollList polls={polls} />
    </>
  )
}
