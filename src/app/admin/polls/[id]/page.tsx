import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { EditorHeader } from "@/components/editor-header"
import { PollForm } from "@/components/poll-form"
import { PollResults } from "@/components/poll-results"

export const metadata = { title: "Edit Poll" }

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditPollPage({ params }: Props) {
  await requireRole("EDITOR")
  const { id } = await params

  const poll = await db.poll.findUnique({
    where: { id },
    include: {
      options: {
        orderBy: { order: "asc" },
        include: { _count: { select: { votes: true } } },
      },
      _count: { select: { votes: true } },
    },
  })
  if (!poll) notFound()

  const totalVotes = poll._count.votes

  const voters = poll.anonymous
    ? []
    : (
        await db.pollVote.findMany({
          where: { pollId: id },
          select: { optionId: true, user: { select: { name: true, email: true } } },
        })
      ).map((v) => ({ optionId: v.optionId, name: v.user.name ?? v.user.email ?? "Unknown" }))

  return (
    <>
      <EditorHeader backHref="/admin/polls" backLabel="Polls" title="Edit poll" />
      <div className="space-y-8">
        <PollForm
          poll={{
            id: poll.id,
            question: poll.question,
            status: poll.status,
            anonymous: poll.anonymous,
            multiChoice: poll.multiChoice,
            resultsVisibility: poll.resultsVisibility,
            endsAt: poll.endsAt ? poll.endsAt.toISOString().slice(0, 16) : "",
          }}
          options={poll.options.map((o) => o.text)}
        />
        <PollResults
          options={poll.options.map((o) => ({ id: o.id, text: o.text, voteCount: o._count.votes }))}
          totalVotes={totalVotes}
          anonymous={poll.anonymous}
          voters={voters}
        />
      </div>
    </>
  )
}
