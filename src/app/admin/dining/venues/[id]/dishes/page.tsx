import { redirect } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function DishesRedirect({ params }: Props) {
  const { id } = await params
  redirect(`/admin/dining/venues/${id}?tab=dishes`)
}
