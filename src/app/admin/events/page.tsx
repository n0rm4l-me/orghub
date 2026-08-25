import { redirect } from "next/navigation"

// Events are articles with an eventDate. The admin manages them from the Articles page.
export default function AdminEventsPage() {
  redirect("/admin/articles")
}
