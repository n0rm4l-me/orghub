"use client"

import { Toast } from "@base-ui/react/toast"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"

/**
 * Module-scoped manager so server-action callers can fire toasts without
 * threading context through every component.
 */
export const toastManager = Toast.createToastManager()

export const toast = {
  success: (title: string, description?: string) =>
    toastManager.add({ title, description, type: "success" }),
  error: (title: string, description?: string) =>
    toastManager.add({ title, description, type: "error", timeout: 8000, priority: "high" }),
  info: (title: string, description?: string) =>
    toastManager.add({ title, description, type: "info" }),
}

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const

const ACCENTS = {
  success: "text-emerald-600",
  error: "text-red-600",
  info: "text-blue-600",
} as const

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed bottom-4 right-4 z-[100] flex w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-2">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

function ToastList() {
  const { toasts } = Toast.useToastManager()

  return toasts.map((t) => {
    const kind = (t.type ?? "info") as keyof typeof ICONS
    const Icon = ICONS[kind] ?? Info

    return (
      <Toast.Root
        key={t.id}
        toast={t}
        className="flex items-start gap-3 rounded-xl border border-border bg-popover p-3.5 text-popover-foreground shadow-lg
          transition-all duration-200
          data-[ending-style]:translate-x-2 data-[ending-style]:opacity-0
          data-[starting-style]:translate-x-2 data-[starting-style]:opacity-0
          data-[limited]:opacity-0"
      >
        <Icon className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${ACCENTS[kind] ?? ACCENTS.info}`} />
        <div className="min-w-0 flex-1">
          <Toast.Title className="text-sm font-semibold text-foreground" />
          <Toast.Description className="mt-0.5 text-xs leading-relaxed text-muted-foreground" />
        </div>
        <Toast.Close
          aria-label="Dismiss notification"
          className="-m-1 rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </Toast.Close>
      </Toast.Root>
    )
  })
}
