import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { PageHeader } from "@/components/ui/page-header"
import { NewVenueForm } from "@/components/dining/new-venue-form"

export const metadata = { title: "New venue" }

interface Props {
  searchParams: Promise<{ locationId?: string }>
}

export default async function NewVenuePage({ searchParams }: Props) {
  await requireRole("ADMIN")
  const sp = await searchParams
  const locations = await db.location.findMany({ orderBy: { name: "asc" } })
  if (locations.length === 0) redirect("/admin/dining")

  return (
    <div className="max-w-2xl">
      <PageHeader title="New venue" back={{ href: "/admin/dining", label: "Dining" }} />
      <NewVenueForm locations={locations} defaultLocationId={sp.locationId} />
    </div>
  )
}
