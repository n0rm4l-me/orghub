import type { ReactNode } from "react"

type ColType = "text" | "date" | "center" | "number" | "icon" | "reorder" | "actions"

const HEADER_CLASS: Record<ColType, string> = {
  text:    "px-4 sm:px-5 py-3 text-left",
  date:    "px-4 sm:px-5 py-3 text-left",
  center:  "px-4 sm:px-5 py-3 text-center",
  number:  "px-2 py-3 text-center",
  icon:    "px-1 py-3 text-center",
  reorder: "px-2 py-3",
  actions: "px-2 sm:px-5 py-3 text-center",
}

const CELL_CLASS: Record<ColType, string> = {
  text:    "px-4 sm:px-5 py-3",
  date:    "px-4 sm:px-5 py-3 text-sm whitespace-nowrap text-muted-foreground",
  center:  "px-4 sm:px-5 py-3 text-center",
  number:  "px-2 py-3 text-center text-sm font-medium text-muted-foreground",
  icon:    "px-0.5 py-3 !align-middle text-center",
  reorder: "px-1.5 py-2 !align-middle",
  actions: "px-2 sm:px-5 py-3",
}

export interface AdminTableCol<T> {
  id: string
  header?: ReactNode
  headerTitle?: string
  width?: string
  type?: ColType
  hideOnMobile?: boolean
  render: (row: T) => ReactNode
}

export function AdminTable<T,>({
  columns,
  rows,
  rowKey,
  rowAlign = "top",
}: {
  columns: AdminTableCol<T>[]
  rows: T[]
  rowKey: (row: T) => string
  rowAlign?: "top" | "middle"
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card text-card-foreground">
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b border-border text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {columns.map((col) => {
              const type = col.type ?? "text"
              const mobile = col.hideOnMobile ? " hidden sm:table-cell" : ""
              return (
                <th
                  key={col.id}
                  className={`${HEADER_CLASS[type]} ${col.width ?? ""}${mobile}`}
                  title={col.headerTitle}
                >
                  {col.header}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className={`divide-y divide-border ${rowAlign === "middle" ? "[&_td]:align-middle" : "[&_td]:align-top"}`}>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="group transition-colors hover:bg-muted/60">
              {columns.map((col) => {
                const type = col.type ?? "text"
                const content = col.render(row)
                const mobile = col.hideOnMobile ? " hidden sm:table-cell" : ""
                return (
                  <td key={col.id} className={`${CELL_CLASS[type]}${mobile}`}>
                    {type === "actions" ? (
                      <div className="flex items-center justify-center gap-1.5">{content}</div>
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
