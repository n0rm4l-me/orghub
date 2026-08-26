"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Lock, Pencil } from "lucide-react"
import { deletePoll, closePoll } from "@/lib/actions/polls"
import { DeleteButton } from "@/components/ui/delete-button"
import { useAction } from "@/lib/use-action"
import { EmptyState } from "@/components/ui/empty-state"
import { BarChart2 } from "lucide-react"

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

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full table-fixed">
        <colgroup>
          <col />
          <col className="w-20" />
          <col className="w-12" />
          <col className="w-24" />
          <col className="w-24" />
        </colgroup>
        <thead>
          <tr className="border-b border-gray-100 text-xs font-semibold tracking-wide text-gray-400 uppercase">
            <th className="px-5 py-3 text-left">Question</th>
            <th className="px-5 py-3 text-left">Status</th>
            <th className="px-5 py-3 text-left">Votes</th>
            <th className="px-5 py-3 text-left">Ends</th>
            <th className="px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {polls.map((poll) => (
            <tr key={poll.id} className="group transition-colors hover:bg-gray-50/70">
              <td className="px-5 py-3">
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
              </td>
              <td className="px-5 py-3">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[poll.status]}`}
                >
                  {poll.status[0] + poll.status.slice(1).toLowerCase()}
                </span>
              </td>
              <td className="px-5 py-3 text-xs text-gray-400">{poll._count.votes}</td>
              <td className="px-5 py-3 text-xs text-gray-500">
                {poll.endsAt
                  ? new Date(poll.endsAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center justify-end gap-1.5">
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
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
