import { signOut } from "@/auth"
import Link from "next/link"
import { ShieldOff, UserX } from "lucide-react"
import { getCurrentUser } from "@/lib/rbac"

export const metadata = { title: "No access" }

const COPY = {
  inactive: {
    icon: UserX,
    title: "Your account is deactivated",
    body: "An administrator has disabled this account, so it can no longer sign in. Contact your IT team if you think this is a mistake.",
  },
  role: {
    icon: ShieldOff,
    title: "You do not have access to this area",
    body: "Your account does not carry the permissions this page requires. Ask an administrator to grant them if you need to work here.",
  },
} as const

export default async function NoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; need?: string }>
}) {
  const { reason, need } = await searchParams
  const variant = reason === "inactive" ? "inactive" : "role"
  const { icon: Icon, title, body } = COPY[variant]
  const user = await getCurrentUser()

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span
        aria-hidden
        className="mb-5 grid size-12 place-items-center rounded-xl bg-amber-50 text-amber-600"
      >
        <Icon className="size-6" />
      </span>

      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{body}</p>

      {variant === "role" && need && (
        <p className="mt-3 text-xs text-gray-400">
          Required role: <span className="font-medium text-gray-600 capitalize">{need}</span>
          {user && (
            <>
              {" · "}yours: <span className="font-medium text-gray-600 capitalize">
                {user.role.toLowerCase()}
              </span>
            </>
          )}
        </p>
      )}

      <div className="mt-7 flex items-center gap-2">
        <Link
          href="/"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition
            hover:brightness-95 active:brightness-90"
        >
          Back to portal
        </Link>
        <form
          action={async () => {
            "use server"
            await signOut({ redirectTo: "/login" })
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium
              text-gray-700 transition hover:bg-gray-50"
          >
            Sign in as someone else
          </button>
        </form>
      </div>
    </div>
  )
}
