import { notFound } from "next/navigation"
import { Award } from "lucide-react"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { getCurrentUser } from "@/lib/rbac"
import { db } from "@/lib/db"
import { gravatarUrl } from "@/lib/gravatar"
import { getKudosWall, getMyKudosBalance } from "@/lib/actions/kudos"
import { SendKudosButton } from "@/components/send-kudos-button"
import { TablePagination } from "@/components/ui/table-pagination"

export const metadata = { title: "Kudos" }

interface Props {
  searchParams: Promise<{ page?: string }>
}

const DATE_FMT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }

export default async function KudosPage({ searchParams }: Props) {
  const settings = await getSettings()
  if (!parseModules(settings.enabledModules).has("kudos")) notFound()

  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const PER_PAGE = 20

  const [user, { rows, total }, balance] = await Promise.all([
    getCurrentUser(),
    getKudosWall(page, PER_PAGE),
    getMyKudosBalance(),
  ])

  const kudosValues = settings.kudosValues.split(",").map((v) => v.trim()).filter(Boolean)

  const allUsers = user
    ? await db.user.findMany({
        where: { active: true, NOT: { id: user.id } },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : []

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Kudos wall</h1>
          <p className="mt-1 text-sm text-gray-500">Recognise your colleagues for their contributions.</p>
        </div>
        {user && balance && (
          <div className="flex flex-col items-end gap-2">
            <SendKudosButton
              users={allUsers}
              values={kudosValues}
              monthlyBudget={balance.budget}
              remaining={balance.remaining}
            />
            <p className="text-xs text-gray-400">
              {balance.budget > 0
                ? `${balance.remaining ?? 0} of ${balance.budget} coins left this month`
                : "Unlimited coins"}
            </p>
          </div>
        )}
      </div>

      {/* Balance card */}
      {user && balance && (
        <div className="mb-6 flex gap-3 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-brand">{balance.totalReceived}</p>
            <p className="mt-0.5 text-xs text-gray-500">Received</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-gray-700">{balance.spentThisMonth}</p>
            <p className="mt-0.5 text-xs text-gray-500">Sent this month</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-gray-700">{balance.available}</p>
            <p className="mt-0.5 text-xs text-gray-500">Available to redeem</p>
          </div>
          {balance.redeemEnabled && balance.available > 0 && (
            <>
              <div className="w-px bg-gray-100" />
              <div className="flex flex-col items-center justify-center">
                <RedeemButton available={balance.available} rateLabel={balance.redeemRateLabel} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Wall */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <Award className="mx-auto mb-3 size-10 text-gray-300" aria-hidden />
          <p className="text-sm font-medium text-gray-500">No kudos yet</p>
          <p className="mt-1 text-xs text-gray-400">Be the first to recognise a colleague.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((k) => {
            const fromAvatar = settings.gravatarsEnabled ? gravatarUrl(k.from.email, 40) : null
            const toAvatar   = settings.gravatarsEnabled ? gravatarUrl(k.to.email,   40) : null
            const fromInitials = initialsOf(k.from.name ?? k.from.email)
            const toInitials   = initialsOf(k.to.name   ?? k.to.email)
            return (
              <li key={k.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  {fromAvatar ? (
                    <img src={fromAvatar} alt="" className="size-9 shrink-0 rounded-full bg-gray-100 mt-0.5" />
                  ) : (
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand mt-0.5">
                      {fromInitials}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">{k.from.name ?? k.from.email.split("@")[0]}</span>
                      {" gave "}
                      <span className="font-semibold text-gray-900">{k.to.name ?? k.to.email.split("@")[0]}</span>
                      {" "}
                      <span className="font-semibold text-brand">{k.amount} {k.amount === 1 ? "coin" : "coins"}</span>
                      {k.value && (
                        <span className="ml-1.5 inline-block rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                          {k.value}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">{k.message}</p>
                    <p className="mt-1.5 text-xs text-gray-400">
                      {new Date(k.createdAt).toLocaleDateString("en-US", DATE_FMT)}
                    </p>
                  </div>
                  {toAvatar ? (
                    <img src={toAvatar} alt="" className="size-9 shrink-0 rounded-full bg-gray-100 mt-0.5" />
                  ) : (
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-600 mt-0.5">
                      {toInitials}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {total > PER_PAGE && (
        <TablePagination
          basePath="/kudos"
          page={page}
          totalPages={Math.ceil(total / PER_PAGE)}
          params={params}
        />
      )}
    </div>
  )
}

function initialsOf(name: string) {
  return name.split(/[\s@.]+/).filter(Boolean).map((p) => p[0]).join("").toUpperCase().slice(0, 2) || "?"
}

// ─── Redeem button (client component) ────────────────────────────────────────

import { RedeemButton } from "@/components/redeem-kudos-button"
