import { getSettings } from "@/lib/settings"
import { FeedSkeleton } from "@/components/skeletons"

export default async function Loading() {
  const settings = await getSettings()
  return <FeedSkeleton layout={settings.feedLayout ?? "sidebar-right"} />
}
