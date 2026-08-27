import { requireRole } from "@/lib/rbac"
import { createAnnouncement } from "@/lib/actions/announcements"
import { EditorHeader } from "@/components/editor-header"
import { AnnouncementForm } from "../_form"

export const metadata = { title: "New announcement" }

export default async function NewAnnouncementPage() {
  await requireRole("EDITOR")

  return (
    <div>
      <EditorHeader backHref="/admin/announcements" backLabel="Announcements" title="New announcement" />
      <AnnouncementForm action={createAnnouncement} redirectAfterSave="/admin/announcements" />
    </div>
  )
}
