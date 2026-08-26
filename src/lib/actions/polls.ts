"use server"

import { db } from "@/lib/db"
import { requireRole, getCurrentUser } from "@/lib/rbac"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import type { PollCardPoll, PollOption } from "@/components/poll-card"

export async function getPollForEmbed(id: string): Promise<
  | { poll: PollCardPoll; options: PollOption[]; totalVotes: number; votedOptionIds: string[] }
  | { disabled: true }
  | null
> {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()])
  if (!parseModules(settings.enabledModules).has("polls")) return { disabled: true }
  const raw = await db.poll.findUnique({
    where: { id },
    include: {
      options: { orderBy: { order: "asc" }, include: { _count: { select: { votes: true } } } },
      _count: { select: { votes: true } },
    },
  })
  if (!raw) return null

  const userVotes = user
    ? await db.pollVote.findMany({ where: { pollId: id, userId: user.id }, select: { optionId: true } })
    : []

  return {
    poll: {
      id: raw.id,
      question: raw.question,
      anonymous: raw.anonymous,
      multiChoice: raw.multiChoice,
      resultsVisibility: raw.resultsVisibility,
      status: raw.status,
      endsAt: raw.endsAt,
    },
    options: raw.options.map((o) => ({ id: o.id, text: o.text, voteCount: o._count.votes })),
    totalVotes: raw._count.votes,
    votedOptionIds: userVotes.map((v) => v.optionId),
  }
}

export async function getActivePollsForInsert(): Promise<Array<{ id: string; question: string }>> {
  await requireRole("EDITOR")
  return db.poll.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { id: true, question: true },
  })
}
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { type ActionResult, ok, okWith, fail } from "@/lib/actions/types"
type PollStatus = "DRAFT" | "ACTIVE" | "CLOSED"
type ResultsVisibility = "ALWAYS" | "AFTER_VOTE" | "AFTER_CLOSE" | "NEVER"

const VALID_STATUSES = new Set<PollStatus>(["DRAFT", "ACTIVE", "CLOSED"])
const VALID_VISIBILITY = new Set<ResultsVisibility>(["ALWAYS", "AFTER_VOTE", "AFTER_CLOSE", "NEVER"])

interface ParsedPoll {
  question: string
  options: string[]
  anonymous: boolean
  multiChoice: boolean
  resultsVisibility: ResultsVisibility
  status: PollStatus
  endsAt: Date | null
}

function parsePoll(formData: FormData): ParsedPoll | { error: string; field: string } {
  const question = ((formData.get("question") as string) ?? "").trim()
  if (!question) return { error: "Question is required.", field: "question" }
  if (question.length > 500) return { error: "Question must be 500 characters or fewer.", field: "question" }

  const optionsRaw = formData.getAll("option") as string[]
  const options = optionsRaw.map((o) => o.trim()).filter(Boolean)
  if (options.length < 2) return { error: "At least 2 options are required.", field: "options" }
  if (options.length > 10) return { error: "Maximum 10 options allowed.", field: "options" }

  const visibilityRaw = (formData.get("resultsVisibility") as string) || "AFTER_VOTE"
  if (!VALID_VISIBILITY.has(visibilityRaw as ResultsVisibility))
    return { error: "Invalid results visibility.", field: "resultsVisibility" }

  const statusRaw = (formData.get("status") as string) || "DRAFT"
  if (!VALID_STATUSES.has(statusRaw as PollStatus))
    return { error: "Invalid status.", field: "status" }

  const endsAtRaw = ((formData.get("endsAt") as string) ?? "").trim()
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null
  if (endsAt && isNaN(endsAt.getTime())) return { error: "Invalid closing date.", field: "endsAt" }

  return {
    question,
    options,
    anonymous: formData.get("anonymous") === "true",
    multiChoice: formData.get("multiChoice") === "true",
    resultsVisibility: visibilityRaw as ResultsVisibility,
    status: statusRaw as PollStatus,
    endsAt,
  }
}

export async function createPoll(formData: FormData): Promise<ActionResult<string>> {
  const user = await requireRole("EDITOR")
  const parsed = parsePoll(formData)
  if ("error" in parsed) return fail(parsed.error, parsed.field)

  const poll = await db.$transaction(async (tx) => {
    const p = await tx.poll.create({
      data: {
        question: parsed.question,
        anonymous: parsed.anonymous,
        multiChoice: parsed.multiChoice,
        resultsVisibility: parsed.resultsVisibility,
        status: parsed.status,
        endsAt: parsed.endsAt,
        authorId: user.id,
      },
    })
    await tx.pollOption.createMany({
      data: parsed.options.map((text, i) => ({ pollId: p.id, text, order: i })),
    })
    return p
  })

  await logAudit({ userId: user.id, action: "poll.create", resourceType: "Poll", resourceId: poll.id, metadata: { question: parsed.question } })
  revalidatePath("/admin/polls")
  revalidatePath("/polls")
  return okWith(poll.id, "Poll created.")
}

export async function updatePoll(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const parsed = parsePoll(formData)
  if ("error" in parsed) return fail(parsed.error, parsed.field)

  const existing = await db.poll.findUnique({ where: { id } })
  if (!existing) return fail("Poll not found.")

  await db.$transaction(async (tx) => {
    await tx.poll.update({
      where: { id },
      data: {
        question: parsed.question,
        anonymous: parsed.anonymous,
        multiChoice: parsed.multiChoice,
        resultsVisibility: parsed.resultsVisibility,
        status: parsed.status,
        endsAt: parsed.endsAt,
      },
    })
    await tx.pollOption.deleteMany({ where: { pollId: id } })
    await tx.pollOption.createMany({
      data: parsed.options.map((text, i) => ({ pollId: id, text, order: i })),
    })
  })

  await logAudit({ userId: user.id, action: "poll.update", resourceType: "Poll", resourceId: id })
  revalidatePath("/admin/polls")
  revalidatePath(`/admin/polls/${id}`)
  revalidatePath("/polls")
  return ok("Poll saved.")
}

export async function deletePoll(id: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const existing = await db.poll.findUnique({ where: { id } })
  if (!existing) return fail("Poll not found.")

  await db.poll.delete({ where: { id } })
  await logAudit({ userId: user.id, action: "poll.delete", resourceType: "Poll", resourceId: id })
  revalidatePath("/admin/polls")
  revalidatePath("/polls")
  return ok("Poll deleted.")
}

export async function closePoll(id: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const existing = await db.poll.findUnique({ where: { id } })
  if (!existing) return fail("Poll not found.")

  await db.poll.update({ where: { id }, data: { status: "CLOSED" } })
  await logAudit({ userId: user.id, action: "poll.close", resourceType: "Poll", resourceId: id })
  revalidatePath("/admin/polls")
  revalidatePath("/polls")
  return ok("Poll closed.")
}

export async function castVote(pollId: string, optionIds: string[]): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail("You must be signed in to vote.")

  if (!optionIds.length) return fail("Select at least one option.")

  const poll = await db.poll.findUnique({
    where: { id: pollId },
    include: { options: { select: { id: true } } },
  })
  if (!poll) return fail("Poll not found.")
  if (poll.status !== "ACTIVE") return fail("This poll is not accepting votes.")
  if (poll.endsAt && poll.endsAt < new Date()) return fail("This poll has closed.")

  if (!poll.multiChoice && optionIds.length > 1) return fail("This poll is single-choice.")

  const validIds = new Set(poll.options.map((o) => o.id))
  if (!optionIds.every((id) => validIds.has(id))) return fail("Invalid option.")

  const alreadyVoted = await db.pollVote.findFirst({
    where: { pollId, userId: user.id },
  })
  if (alreadyVoted) return fail("You have already voted in this poll.")

  await db.pollVote.createMany({
    data: optionIds.map((optionId) => ({ pollId, optionId, userId: user.id })),
    skipDuplicates: true,
  })

  revalidatePath("/polls")
  revalidatePath(`/admin/polls/${pollId}`)
  return ok("Vote recorded.")
}
