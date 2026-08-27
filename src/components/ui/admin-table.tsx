import type { ReactNode } from "react"

type ColType = "text" | "date" | "center" | "number" | "icon" | "reorder" | "actions"

const HEADER_CLASS: Record<ColType, string> = {
  text:    "px-5 py-3 text-left",
  date:    "px-5 py-3 text-left",
  center:  "px-5 py-3 text-center",
  number:  "px-2 py-3 text-center",
  icon:    "px-1 py-3 text-center",
  reorder: "px-2 py-3",
  actions: "px-5 py-3 text-right",
}

const CELL_CLASS: Record<ColType, string> = {
  text:    "px-5 py-3",
  date:    "px-5 py-3 text-xs whitespace-nowrap text-gray-400",
  center:  "px-5 py-3 text-center",
  number:  "px-2 py-3 text-center text-xs text-gray-400",
  icon:    "px-0.5 py-3 !align-middle text-center",
  reorder: "px-1.5 py-2 !align-middle",
  actions: "px-5 py-3",
}

export interface AdminTableCol<T> {
  id: string
  header?: ReactNode
  headerTitle?: string
  width?: string
  type?: ColType
  render: (row: T) => ReactNode
}

export function AdminTable<T,>({
  columns,
  rows,
  rowKey,
}: {
  columns: AdminTableCol<T>[]
  rows: T[]
  rowKey: (row: T) => string
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full table-fixed">
        <colgroup>
          {columns.map((col) => (
            <col key={col.id} className={col.width} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-gray-100 text-xs font-semibold tracking-wide text-gray-400 uppercase">
            {columns.map((col) => {
              const type = col.type ?? "text"
              return (
                <th key={col.id} className={HEADER_CLASS[type]} title={col.headerTitle}>
                  {col.header}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 [&_td]:align-top">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="group transition-colors hover:bg-gray-50/70">
              {columns.map((col) => {
                const type = col.type ?? "text"
                const content = col.render(row)
                return (
                  <td key={col.id} className={CELL_CLASS[type]}>
                    {type === "actions" ? (
                      <div className="flex items-center justify-end gap-1.5">{content}</div>
                    ) : (
                      content
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
