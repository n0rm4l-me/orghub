import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <TableSkeleton rows={6} cols={5} />
    </div>
  )
}
