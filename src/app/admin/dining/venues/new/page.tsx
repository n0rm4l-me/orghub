import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
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
    <div className="max-w-xl">
      <div className="mb-6">
        <Link href="/admin/dining" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="size-4" aria-hidden />
          Dining
        </Link>
      </div>
      <PageHeader title="New venue" />
      <NewVenueForm locations={locations} defaultLocationId={sp.locationId} />
    </div>
  )
}
