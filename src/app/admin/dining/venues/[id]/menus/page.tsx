import { redirect } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function MenusRedirect({ params }: Props) {
  const { id } = await params
  redirect(`/admin/dining/venues/${id}?tab=menus`)
}
