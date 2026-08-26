import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { updateAnnouncement } from "@/lib/actions/announcements"
import { PageHeader } from "@/components/ui/page-header"
import { AnnouncementForm } from "../../_form"

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = { title: "Edit announcement" }

export default async function EditAnnouncementPage({ params }: Props) {
  await requireRole("EDITOR")
  const { id } = await params

  const announcement = await db.announcement.findUnique({
    where: { id },
    select: { id: true, message: true, linkUrl: true, linkLabel: true, color: true, showFrom: true, showUntil: true },
  })
  if (!announcement) notFound()

  return (
    <div>
      <PageHeader title="Edit announcement" description="Update message, schedule, or style." />
      <AnnouncementForm
        values={announcement}
        action={updateAnnouncement.bind(null, id)}
        redirectAfterSave="/admin/announcements"
      />
    </div>
  )
}
