"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Lock, Pencil } from "lucide-react"
import { deletePoll, closePoll } from "@/lib/actions/polls"
import { DeleteButton } from "@/components/ui/delete-button"
import { useAction } from "@/lib/use-action"
import { EmptyState } from "@/components/ui/empty-state"
import { BarChart2 } from "lucide-react"
import { AdminTable } from "@/components/ui/admin-table"
import type { AdminTableCol } from "@/components/ui/admin-table"

type Poll = {
  id: string
  question: string
  status: "DRAFT" | "ACTIVE" | "CLOSED"
  anonymous: boolean
  multiChoice: boolean
  endsAt: Date | null
  createdAt: Date
  _count: { votes: number }
}

const STATUS_STYLES: Record<Poll["status"], string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  ACTIVE: "bg-green-100 text-green-700",
  CLOSED: "bg-red-100 text-red-600",
}

function CloseButton({ id }: { id: string }) {
  const router = useRouter()
  const { run, pending } = useAction(() => closePoll(id), {
    onSuccess: () => router.refresh(),
  })
  return (
    <button
      type="button"
      onClick={() => run()}
      disabled={pending}
      aria-label="Close poll"
      className="grid size-7 place-items-center rounded-md text-gray-400 transition
        hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      <Lock className="size-3.5" aria-hidden />
    </button>
  )
}

const columns: AdminTableCol<Poll>[] = [
  {
    id: "question",
    header: "Question",
    type: "text",
    render: (poll) => (
      <>
        <Link
          href={`/admin/polls/${poll.id}`}
          className="block truncate text-sm font-medium text-gray-900 hover:text-brand"
        >
          {poll.question}
        </Link>
        <p className="mt-0.5 text-xs text-gray-400">
          {poll.anonymous && "Anonymous · "}
          {poll.multiChoice && "Multi-choice · "}
          {new Date(poll.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </>
    ),
  },
  {
    id: "status",
    header: "Status",
    width: "w-24",
    type: "center",
    render: (poll) => (
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[poll.status]}`}
      >
        {poll.status[0] + poll.status.slice(1).toLowerCase()}
      </span>
    ),
  },
  {
    id: "votes",
    header: "Votes",
    width: "w-16",
    type: "number",
    render: (poll) => poll._count.votes,
  },
  {
    id: "ends",
    header: "Ends",
    width: "w-36",
    type: "date",
    render: (poll) =>
      poll.endsAt ? (
        new Date(poll.endsAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      ) : (
        <span className="text-gray-300">—</span>
      ),
  },
  {
    id: "actions",
    header: "Actions",
    width: "w-36",
    type: "actions",
    render: (poll) => (
      <>
        {poll.status === "ACTIVE" && <CloseButton id={poll.id} />}
        <Link
          href={`/admin/polls/${poll.id}`}
          aria-label="Edit poll"
          className="grid size-7 place-items-center rounded-md text-gray-400 transition
            hover:bg-gray-100 hover:text-gray-700"
        >
          <Pencil className="size-3.5" aria-hidden />
        </Link>
        <DeleteButton
          onDelete={() => deletePoll(poll.id)}
          entity="poll"
          name={poll.question}
          note="All votes will be deleted too."
          variant="icon"
        />
      </>
    ),
  },
]

export function PollList({ polls }: { polls: Poll[] }) {
  if (!polls.length) {
    return (
      <EmptyState
        icon={BarChart2}
        title="No polls yet"
        description="Create your first poll to start collecting votes from the team."
        action={{ label: "Create poll", href: "/admin/polls/new" }}
      />
    )
  }

  return <AdminTable columns={columns} rows={polls} rowKey={(p) => p.id} rowAlign="middle" />
}
