"use client"

import { useState } from "react"
import { useAction } from "@/lib/use-action"
import { toast } from "@/components/ui/toaster"
import type { ActionResult } from "@/lib/actions/types"

/**
 * Shared state/effects for the "list of named rows the admin can reorder,
 * add, remove, and save as a batch" editors (venue tags, nutrition params).
 * Each row needs `order` (rewritten on every add/remove/move so it always
 * matches array position) and `name` (validated non-empty before saving).
 */
export function useOrderedRows<T extends { order: number; name: string }, R = undefined>(
  initial: T[],
  persistAction: (rows: T[]) => Promise<ActionResult<R>>,
  makeNewRow: (order: number) => T,
  validationMessage: string,
  onSuccess: () => void,
) {
  const [rows, setRows] = useState<T[]>(initial)
  const { run, pending } = useAction(persistAction, { onSuccess })

  function update(i: number, patch: Partial<T>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((rs) => [...rs, makeNewRow(rs.length)])
  }

  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, j) => j !== i).map((r, j) => ({ ...r, order: j })))
  }

  function moveRow(i: number, dir: "up" | "down") {
    const j = dir === "up" ? i - 1 : i + 1
    if (j < 0 || j >= rows.length) return
    setRows((rs) => {
      const next = [...rs]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next.map((r, k) => ({ ...r, order: k }))
    })
  }

  function handleSave() {
    for (const r of rows) {
      if (!r.name.trim()) { toast.error(validationMessage); return }
    }
    run(rows)
  }

  return { rows, update, addRow, removeRow, moveRow, handleSave, pending }
}
