"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Award, X, Loader2, Search } from "lucide-react"
import { sendKudos, searchKudosRecipients } from "@/lib/actions/kudos"
import { toast } from "@/components/ui/toaster"
import { createPortal } from "react-dom"

interface UserOption {
  id: string
  name: string | null
  email: string
}

interface Props {
  values: string[]
  monthlyBudget: number
  remaining: number | null
}

export function SendKudosButton({ values, monthlyBudget, remaining }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<UserOption[]>([])
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)
  const [amount, setAmount] = useState(1)
  const [value, setValue] = useState("")
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const toId = selectedUser?.id ?? ""

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) return
    let cancelled = false
    const id = setTimeout(() => {
      searchKudosRecipients(trimmed).then((rows) => { if (!cancelled) setResults(rows) })
    }, 200)
    return () => { cancelled = true; clearTimeout(id) }
  }, [query])

  function close() {
    setOpen(false)
    setQuery("")
    setResults([])
    setSelectedUser(null)
    setAmount(1)
    setValue("")
    setMessage("")
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(formRef.current!)
    fd.set("toId", toId)
    fd.set("amount", String(amount))
    fd.set("value", value)
    startTransition(async () => {
      const res = await sendKudos(fd)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(res.message ?? "Kudos sent!")
      close()
    })
  }

  const maxAmount = remaining !== null ? remaining : monthlyBudget || 999

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium
          text-white transition hover:brightness-95 active:brightness-90"
      >
        <Award className="size-4" aria-hidden />
        Send kudos
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/25 backdrop-blur-[2px] p-4"
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <div className="w-full max-w-md rounded-xl bg-popover shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-foreground">Send kudos</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form ref={formRef} onSubmit={submit} className="space-y-4 p-6">
              {/* Recipient */}
              <div>
                <label id="kudos-to-label" className="mb-1.5 block text-sm font-medium text-foreground">
                  To <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                {selectedUser ? (
                  <div className="flex items-center justify-between rounded-lg border border-brand bg-brand/5 px-3 py-2">
                    <span className="text-sm font-medium text-foreground">
                      {selectedUser.name ?? selectedUser.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setSelectedUser(null); setQuery("") }}
                      className="text-xs text-brand hover:underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search colleagues…"
                      aria-labelledby="kudos-to-label"
                      className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-base sm:text-sm
                        text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                    {query && (
                      <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border
                        border-border bg-popover shadow-md">
                        {results.length === 0 ? (
                          <li className="px-3 py-2 text-sm text-muted-foreground">No results</li>
                        ) : results.map((u) => (
                          <li key={u.id}>
                            <button
                              type="button"
                              onClick={() => { setSelectedUser(u); setQuery("") }}
                              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                            >
                              {u.name && <span className="font-medium">{u.name}</span>}
                              <span className="ml-1 text-muted-foreground">{u.email}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Amount */}
              {monthlyBudget > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Coins
                    {remaining !== null && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{remaining} left this month</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={maxAmount}
                    value={amount}
                    onChange={(e) => setAmount(Math.max(1, Math.min(maxAmount, parseInt(e.target.value) || 1)))}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base sm:text-sm
                      text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              )}

              {/* Value tag */}
              {values.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Value</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setValue("")}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        value === "" ? "bg-brand text-white" : "bg-muted text-muted-foreground hover:bg-border"
                      }`}
                    >
                      None
                    </button>
                    {values.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setValue(v)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          value === v ? "bg-brand text-white" : "bg-muted text-muted-foreground hover:bg-border"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Message <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <textarea
                  name="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  maxLength={300}
                  rows={3}
                  placeholder="What did they do that made a difference?"
                  className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-base sm:text-sm
                    text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">{message.length}/300</p>
              </div>

              <button
                type="submit"
                disabled={pending || !toId || !message.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm
                  font-medium text-white transition hover:brightness-95 disabled:opacity-60"
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                {pending ? "Sending…" : "Send kudos"}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
