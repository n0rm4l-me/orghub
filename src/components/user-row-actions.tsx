"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { changeUserRole, setUserActive } from "@/lib/actions/users"
import { useAction } from "@/lib/use-action"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

const ROLES = ["VIEWER", "EDITOR", "ADMIN"] as const

const ROLE_LABEL: Record<string, string> = {
  VIEWER: "Viewer",
  EDITOR: "Editor",
  ADMIN: "Admin",
}

interface Props {
  userId: string
  role: string
  active: boolean
  name: string
  /** True for the signed-in admin, who must not lock themselves out. */
  isSelf: boolean
}

export function UserRoleSelect({ userId, role, isSelf }: Omit<Props, "active" | "name">) {
  const { run, pending } = useAction(changeUserRole)

  return (
    <span className="relative inline-flex items-center">
      <select
        value={role}
        disabled={pending || isSelf}
        onChange={(e) => run(userId, e.target.value)}
        aria-label="Role"
        title={isSelf ? "You cannot change your own role" : "Change role"}
        className="w-full appearance-none rounded-lg border border-border bg-card py-1.5 pr-7 pl-2.5
          text-xs font-medium text-foreground transition hover:border-muted-foreground/40 focus:border-brand
          focus:ring-2 focus:ring-brand/20 focus:outline-none disabled:bg-muted
          disabled:text-muted-foreground"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 text-muted-foreground" aria-hidden>
        {pending ? <Loader2 className="size-3 animate-spin" /> : "▾"}
      </span>
    </span>
  )
}

export function UserActiveToggle({ userId, active, name, isSelf }: Omit<Props, "role">) {
  const [open, setOpen] = useState(false)
  const { run, pending } = useAction(setUserActive, { onSuccess: () => setOpen(false) })

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => run(userId, true)}
        disabled={pending}
        className="text-xs font-medium text-muted-foreground transition hover:text-brand disabled:opacity-50"
      >
        {pending ? "Working…" : "Reactivate"}
      </button>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isSelf}
        title={isSelf ? "You cannot deactivate your own account" : "Deactivate this user"}
        className="text-xs font-medium text-muted-foreground transition hover:text-red-600
          disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:text-muted-foreground"
      >
        Deactivate
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Deactivate ${name}?`}
        description="They will be signed out and cannot sign in again until reactivated. Anything they wrote stays published."
        confirmLabel={pending ? "Deactivating…" : "Deactivate"}
        destructive
        pending={pending}
        onConfirm={() => run(userId, false)}
      />
    </>
  )
}
