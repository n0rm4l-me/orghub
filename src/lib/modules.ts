export const MODULES = {
  events: {
    id: "events" as const,
    label: "Events calendar",
    description: "Monthly calendar for company events. Editors add event dates to articles.",
  },
  pages: {
    id: "pages" as const,
    label: "Pages",
    description: "Static wiki-style pages accessible from the main navigation.",
  },
  polls: {
    id: "polls" as const,
    label: "Polls",
    description: "Interactive polls: anonymous, multi-choice, with customizable result visibility.",
  },
  kudos: {
    id: "kudos" as const,
    label: "Kudos",
    description: "Let employees recognise each other with coins, company values, and a public wall.",
  },
  translation: {
    id: "translation" as const,
    label: "Article translation",
    description: "On-demand AI translation of articles via configurable provider.",
  },
  dining: {
    id: "dining" as const,
    label: "Dining",
    description: "Canteen and cafe menus, weekly schedules, and monthly themed topics.",
  },
  suggestions: {
    id: "suggestions" as const,
    label: "Suggestions",
    description: "Employee idea box: submit, upvote, and track status of suggestions.",
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
