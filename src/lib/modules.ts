export const MODULES = {
  events: {
    id: "events" as const,
    label: "Events calendar",
    description: "Monthly calendar for company events. Editors add event dates to articles.",
  },
} as const

export type ModuleId = keyof typeof MODULES

const VALID_IDS = new Set(Object.keys(MODULES))

export function parseModules(raw: string | null | undefined): Set<ModuleId> {
  if (!raw) return new Set()
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter((id) => VALID_IDS.has(id)) as ModuleId[]
  )
}
