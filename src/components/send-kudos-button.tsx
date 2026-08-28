"use client"

import { useRef, useState, useTransition } from "react"
import { Award, X, Loader2, Search } from "lucide-react"
import { sendKudos } from "@/lib/actions/kudos"
import { toast } from "@/components/ui/toaster"
import { createPortal } from "react-dom"

interface UserOption {
  id: string
  name: string | null
  email: string
}

interface Props {
  users: UserOption[]
  values: string[]
  monthlyBudget: number
  remaining: number | null
}

export function SendKudosButton({ users, values, monthlyBudget, remaining }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [toId, setToId] = useState("")
  const [amount, setAmount] = useState(1)
  const [value, setValue] = useState("")
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const filtered = query.trim()
    ? users.filter((u) =>
        (u.name ?? u.email).toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase())
      )
    : users

  const selectedUser = users.find((u) => u.id === toId)

  function close() {
    setOpen(false)
    setQuery("")
    setToId("")
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
          className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/25 backdrop-blur-[2px] p-4"
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Send kudos</h2>
              <button
                type="button"
                onClick={close}
                className="grid size-7 place-items-center rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="size-4" />
              </button>
            </div>

            <form ref={formRef} onSubmit={submit} className="space-y-4 p-6">
              {/* Recipient */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  To <span className="text-red-500">*</span>
                </label>
                {selectedUser ? (
                  <div className="flex items-center justify-between rounded-lg border border-brand bg-brand/5 px-3 py-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {selectedUser.name ?? selectedUser.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setToId(""); setQuery("") }}
                      className="text-xs text-brand hover:underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search colleagues…"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 pl-9 pr-3 text-base sm:text-sm
                        text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                    {query && (
                      <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border
                        border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md">
                        {filtered.length === 0 ? (
                          <li className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">No results</li>
                        ) : filtered.map((u) => (
                          <li key={u.id}>
                            <button
                              type="button"
                              onClick={() => { setToId(u.id); setQuery("") }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              {u.name && <span className="font-medium">{u.name}</span>}
                              <span className="ml-1 text-gray-400 dark:text-gray-500">{u.email}</span>
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
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Coins
                    {remaining !== null && (
                      <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">{remaining} left this month</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={maxAmount}
                    value={amount}
                    onChange={(e) => setAmount(Math.max(1, Math.min(maxAmount, parseInt(e.target.value) || 1)))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-base sm:text-sm
                      text-gray-900 dark:text-gray-100 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              )}

              {/* Value tag */}
              {values.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Value</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setValue("")}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        value === "" ? "bg-brand text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
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
                          value === v ? "bg-brand text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
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
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  maxLength={300}
                  rows={3}
                  placeholder="What did they do that made a difference?"
                  className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-base sm:text-sm
                    text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-500">{message.length}/300</p>
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
