import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { Users } from "lucide-react"
import { requireRole } from "@/lib/rbac"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { AdminFilters } from "@/components/admin-filters"
import { TablePagination } from "@/components/ui/table-pagination"
import { UserRoleSelect, UserActiveToggle } from "@/components/user-row-actions"

export const metadata = { title: "Users" }

const PER_PAGE = 25

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>
}

export default async function UsersPage({ searchParams }: Props) {
  const actor = await requireRole("ADMIN")

  const params = await searchParams
  const query = params.q?.trim() || undefined
  const page = Math.max(1, Number(params.page) || 1)

  const where: Prisma.UserWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      }
    : {}

  const [users, total, admins] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        provider: true,
        createdAt: true,
      },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.user.count({ where }),
    db.user.count({ where: { role: "ADMIN", active: true } }),
  ])

  return (
    <div>
      <PageHeader
        title="Users"
        description={`${total} account${total === 1 ? "" : "s"} · ${admins} admin${
          admins === 1 ? "" : "s"
        }`}
      />

      <AdminFilters
        basePath="/admin/users"
        query={query}
        placeholder="Search by name or email"
        showStatus={false}
      />

      {total === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? "Nobody matched" : "No users yet"}
          description={
            query
              ? "Try a different name or email address."
              : "Accounts are created on first sign-in through your identity provider."
          }
          {...(query ? { action: { label: "Show all users", href: "/admin/users" } } : {})}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full table-fixed">
            <colgroup>
              <col />
              <col className="w-32" />
              <col className="w-24" />
              <col className="w-24" />
              <col className="w-28" />
              <col className="w-24" />
            </colgroup>
            <thead>
              <tr
                className="border-b border-gray-100 text-xs font-semibold tracking-wide text-gray-400
                  uppercase"
              >
                <th className="px-5 py-3 text-left">User</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-left">Sign-in</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Joined</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => {
                const label = user.name ?? user.email
                const initials = label
                  .split(/[\s@.]+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]!.toUpperCase())
                  .join("")
                const isSelf = user.id === actor.id

                return (
                  <tr key={user.id} className="transition-colors hover:bg-gray-50/70">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="grid size-8 shrink-0 place-items-center rounded-full bg-brand/10
                            text-[11px] font-bold text-brand"
                        >
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {user.name ?? user.email}
                            {isSelf && (
                              <span className="ml-1.5 text-xs font-normal text-gray-400">you</span>
                            )}
                          </p>
                          <p className="truncate text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <UserRoleSelect userId={user.id} role={user.role} isSelf={isSelf} />
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500 capitalize">
                      {user.provider ?? "password"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          user.active ? "text-gray-600" : "text-red-600"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`size-1.5 rounded-full ${
                            user.active ? "bg-emerald-500" : "bg-red-400"
                          }`}
                        />
                        {user.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap text-gray-400">
                      {user.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <UserActiveToggle
                        userId={user.id}
                        active={user.active}
                        name={label}
                        isSelf={isSelf}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > PER_PAGE && (
        <TablePagination
          basePath="/admin/users"
          page={page}
          totalPages={Math.ceil(total / PER_PAGE)}
          params={params}
        />
      )}

      <p className="mt-3 text-xs leading-relaxed text-gray-400">
        Viewers read the portal. Editors also write articles and pages. Admins additionally manage
        users, branding, and authentication. The last active admin cannot be demoted or deactivated.
      </p>
    </div>
  )
}
