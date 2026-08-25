import Link from "next/link"
import { FileQuestion, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        <FileQuestion className="h-6 w-6 text-gray-400" strokeWidth={1.5} />
      </div>
      <h1 className="text-lg font-semibold text-gray-900">Page not found</h1>
      <p className="mt-1 max-w-md text-sm text-gray-500">
        This page may have been unpublished, moved, or the link is out of date.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm
          font-medium text-white transition hover:brightness-95 active:brightness-90"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>
    </div>
  )
}
