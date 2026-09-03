import type { SuggestionStatus } from "@prisma/client"

export const STATUS_LABEL: Record<SuggestionStatus, string> = {
  OPEN:         "Open",
  UNDER_REVIEW: "Under Review",
  PLANNED:      "Planned",
  DONE:         "Done",
  DECLINED:     "Declined",
}

export const STATUS_COLOR: Record<SuggestionStatus, string> = {
  OPEN:         "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  UNDER_REVIEW: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  PLANNED:      "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  DONE:         "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  DECLINED:     "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
}
