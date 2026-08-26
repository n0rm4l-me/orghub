import { requireRole } from "@/lib/rbac"
import { createAnnouncement } from "@/lib/actions/announcements"
import { PageHeader } from "@/components/ui/page-header"
import { AnnouncementForm } from "../_form"

export const metadata = { title: "New announcement" }

export default async function NewAnnouncementPage() {
  await requireRole("EDITOR")

  return (
    <div>
      <PageHeader title="New announcement" description="Create a site-wide banner." />
      <AnnouncementForm action={createAnnouncement} redirectAfterSave="/admin/announcements" />
    </div>
  )
}
