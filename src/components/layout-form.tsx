"use client"

import { Loader2 } from "lucide-react"
import { saveLayout } from "@/lib/actions/settings"
import { useAction } from "@/lib/use-action"
import { Panel } from "@/components/ui/field"
import type { ModuleId } from "@/lib/modules"

type LayoutValue = "content" | "sidebar-right" | "sidebar-left" | "sidebar-both"

const PRESETS: { value: LayoutValue; label: string; preview: React.ReactNode }[] = [
  {
    value: "content",
    label: "Content only",
    preview: (
      <div className="flex h-8 w-full gap-0.5">
        <div className="flex-1 rounded bg-current opacity-30" />
      </div>
    ),
  },
  {
    value: "sidebar-right",
    label: "Right sidebar",
    preview: (
      <div className="flex h-8 w-full gap-0.5">
        <div className="flex-1 rounded bg-current opacity-30" />
        <div className="w-3 rounded bg-current opacity-60" />
      </div>
    ),
  },
  {
    value: "sidebar-left",
    label: "Left sidebar",
    preview: (
      <div className="flex h-8 w-full gap-0.5">
        <div className="w-3 rounded bg-current opacity-60" />
        <div className="flex-1 rounded bg-current opacity-30" />
      </div>
    ),
  },
  {
    value: "sidebar-both",
    label: "Both sidebars",
    preview: (
      <div className="flex h-8 w-full gap-0.5">
        <div className="w-3 rounded bg-current opacity-60" />
        <div className="flex-1 rounded bg-current opacity-30" />
        <div className="w-3 rounded bg-current opacity-60" />
      </div>
    ),
  },
]

function LayoutPicker({
  name,
  label,
  value,
}: {
  name: string
  label: string
  value: LayoutValue
}) {
  return (
    <div className="py-3">
      <p className="mb-2 text-sm font-medium text-gray-800">{label}</p>
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((preset) => (
          <label key={preset.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={preset.value}
              defaultChecked={value === preset.value}
              className="peer sr-only"
            />
            <div
              className="flex flex-col gap-1.5 rounded-lg border-2 border-gray-200 p-2 text-gray-400
                transition peer-checked:border-brand peer-checked:text-brand"
            >
              {preset.preview}
              <span className="text-center text-[10px] font-medium leading-tight">
                {preset.label}
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

const CARD_STYLE_PRESETS = [
  {
    value: "compact",
    label: "Title only",
    preview: (
      <div className="space-y-1 py-0.5">
        <div className="h-2 w-full rounded bg-current opacity-40" />
        <div className="h-1.5 w-2/3 rounded bg-current opacity-20" />
      </div>
    ),
  },
  {
    value: "default",
    label: "Title + desc",
    preview: (
      <div className="space-y-1 py-0.5">
        <div className="h-2 w-full rounded bg-current opacity-40" />
        <div className="h-1.5 w-5/6 rounded bg-current opacity-20" />
        <div className="h-1.5 w-3/4 rounded bg-current opacity-20" />
      </div>
    ),
  },
  {
    value: "preview",
    label: "With preview",
    preview: (
      <div className="flex gap-1.5">
        <div className="size-7 shrink-0 rounded bg-current opacity-20" />
        <div className="min-w-0 flex-1 space-y-1 py-0.5">
          <div className="h-2 w-full rounded bg-current opacity-40" />
          <div className="h-1.5 w-3/4 rounded bg-current opacity-20" />
        </div>
      </div>
    ),
  },
]

function CardStylePicker({ name, value }: { name: string; value: string }) {
  return (
    <div className="py-3">
      <p className="mb-2 text-sm font-medium text-gray-800">Feed card style</p>
      <div className="grid grid-cols-3 gap-2">
        {CARD_STYLE_PRESETS.map((preset) => (
          <label key={preset.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={preset.value}
              defaultChecked={value === preset.value}
              className="peer sr-only"
            />
            <div
              className="flex flex-col gap-2 rounded-lg border-2 border-gray-200 p-2 text-gray-400
                transition peer-checked:border-brand peer-checked:text-brand"
            >
              {preset.preview}
              <span className="text-center text-[10px] font-medium leading-tight">
                {preset.label}
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

const WIDTH_PRESETS = [
  {
    value: "narrow",
    label: "Narrow",
    preview: (
      <div className="flex h-6 w-full items-center justify-center">
        <div className="h-full w-3/5 rounded bg-current opacity-30" />
      </div>
    ),
  },
  {
    value: "default",
    label: "Default",
    preview: (
      <div className="flex h-6 w-full items-center justify-center">
        <div className="h-full w-4/5 rounded bg-current opacity-30" />
      </div>
    ),
  },
  {
    value: "wide",
    label: "Wide",
    preview: (
      <div className="flex h-6 w-full items-center justify-center">
        <div className="h-full w-full rounded bg-current opacity-30" />
      </div>
    ),
  },
]

function WidthPicker({ name, value }: { name: string; value: string }) {
  return (
    <div className="py-3">
      <p className="mb-2 text-sm font-medium text-gray-800">Portal width</p>
      <div className="grid grid-cols-3 gap-2">
        {WIDTH_PRESETS.map((preset) => (
          <label key={preset.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={preset.value}
              defaultChecked={value === preset.value}
              className="peer sr-only"
            />
            <div
              className="flex flex-col gap-1.5 rounded-lg border-2 border-gray-200 p-2 text-gray-400
                transition peer-checked:border-brand peer-checked:text-brand"
            >
              {preset.preview}
              <span className="text-center text-[10px] font-medium leading-tight">
                {preset.label}
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

interface Props {
  feedLayout: string
  articleLayout: string
  pagesLayout: string
  portalWidth: string
  feedPageSize: number
  feedCardStyle: string
  enabledModules: Set<ModuleId>
}

export function LayoutForm({ feedLayout, articleLayout, pagesLayout, portalWidth, feedPageSize, feedCardStyle, enabledModules }: Props) {
  const { run, pending } = useAction(saveLayout)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(new FormData(e.currentTarget))
      }}
      className="space-y-6"
    >
      <Panel
        title="Layout"
        description="Choose which sections show sidebars. Widgets can be assigned to left or right below."
        footer={
          <button
            type="submit"
            disabled={pending}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2
              text-sm font-medium text-white transition hover:brightness-95 active:brightness-90
              disabled:opacity-60"
          >
            {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            Save layout
          </button>
        }
      >
        <div className="divide-y divide-gray-100">
          <WidthPicker name="portalWidth" value={portalWidth} />
          <CardStylePicker name="feedCardStyle" value={feedCardStyle} />
          <div className="py-3">
            <label htmlFor="feedPageSize" className="mb-2 block text-sm font-medium text-gray-800">
              Articles per page
            </label>
            <select
              id="feedPageSize"
              name="feedPageSize"
              defaultValue={feedPageSize}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800
                focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              {[5, 10, 15, 20, 25, 30].map((n) => (
                <option key={n} value={n}>{n} articles</option>
              ))}
            </select>
          </div>
          <LayoutPicker name="feedLayout" label="Feed" value={feedLayout as LayoutValue} />
          <LayoutPicker name="articleLayout" label="Article reader" value={articleLayout as LayoutValue} />
          {enabledModules.has("pages") && (
            <LayoutPicker name="pagesLayout" label="Pages" value={pagesLayout as LayoutValue} />
          )}
        </div>
      </Panel>
    </form>
  )
}
