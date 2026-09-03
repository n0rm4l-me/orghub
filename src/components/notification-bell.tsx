"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Bell, Award, MessageSquare, Newspaper, Gift, Bell as BellIcon } from "lucide-react"
import Link from "next/link"

interface NotificationItem {
  id: string
  type: string
  title: string
  body: string | null
  href: string | null
  read: boolean
  createdAt: string
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  "kudos.received":    <Award className="size-4 text-brand" />,
  "kudos.month_reset": <Gift className="size-4 text-emerald-500" />,
  "comment.reply":     <MessageSquare className="size-4 text-blue-500" />,
  "article.important": <Newspaper className="size-4 text-amber-500" />,
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

async function registerPush() {
  if (!VAPID_PUBLIC || !("serviceWorker" in navigator) || !("PushManager" in window)) return
  try {
    const reg = await navigator.serviceWorker.register("/sw.js")
    const perm = await Notification.requestPermission()
    if (perm !== "granted") return
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    })
    const json = sub.toJSON()
    if (!json.keys) return
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }),
    })
  } catch {
    // ignore — push is optional
  }
}

export function NotificationBell() {
  const [count, setCount]         = useState(0)
  const [open, setOpen]           = useState(false)
  const [items, setItems]         = useState<NotificationItem[]>([])
  const [loading, setLoading]     = useState(false)
  const panelRef                  = useRef<HTMLDivElement>(null)

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count")
      if (res.ok) setCount((await res.json()).count ?? 0)
    } catch { /* ignore */ }
  }, [])

  // Poll every 30s, but only when the tab is visible. The bell sits in the
  // header and occupies a connection while dish photos are downloading; pausing
  // when hidden costs nothing and leaves more connections for the page content.
  useEffect(() => {
    fetchCount()
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchCount()
    }, 30_000)
    const onVisible = () => { if (document.visibilityState === "visible") fetchCount() }
    document.addEventListener("visibilitychange", onVisible)
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible) }
  }, [fetchCount])

  // Register service worker once
  useEffect(() => { registerPush() }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const openPanel = async () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    setLoading(true)
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) setItems((await res.json()).items ?? [])
    } finally {
      setLoading(false)
    }
    if (count > 0) {
      setCount(0)
      fetch("/api/notifications/mark-read", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
    }
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={openPanel}
        aria-label="Notifications"
        className="relative flex size-9 items-center justify-center rounded-lg text-white/80
          transition hover:bg-white/10 hover:text-white"
      >
        <BellIcon className="size-5" />
        {count > 0 && (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center
            rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-gray-200
          bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3
            dark:border-gray-800">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </span>
            <Bell className="size-4 text-gray-400" />
          </div>

          <div className="scrollbar-thin max-h-96 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading…</div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">No notifications yet</div>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                {items.map((n) => {
                  const inner = (
                    <div className={`flex gap-3 px-4 py-3 transition hover:bg-gray-50
                      dark:hover:bg-gray-800 ${!n.read ? "bg-brand/5 dark:bg-brand/10" : ""}`}>
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center
                        rounded-full bg-gray-100 dark:bg-gray-800">
                        {TYPE_ICON[n.type] ?? <Bell className="size-4 text-gray-400" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  )

                  return (
                    <li key={n.id}>
                      {n.href ? (
                        <Link href={n.href} onClick={() => setOpen(false)}>{inner}</Link>
                      ) : (
                        inner
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
