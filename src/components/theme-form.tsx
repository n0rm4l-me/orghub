"use client"

import { useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { saveTheme } from "@/lib/actions/settings"
import { useAction } from "@/lib/use-action"
import { BrandLogo } from "@/components/brand-logo"
import { Panel, inputClass } from "@/components/ui/field"

const PRESETS = [
  { name: "Corporate blue", color: "#2563eb" },
  { name: "Crimson", color: "#bf0000" },
  { name: "Deep navy", color: "#1e3a5f" },
  { name: "Forest", color: "#15803d" },
  { name: "Royal purple", color: "#6d28d9" },
  { name: "Slate", color: "#334155" },
  { name: "Teal", color: "#0d9488" },
  { name: "Amber", color: "#b45309" },
]

const HEX = /^#[0-9a-f]{6}$/i

interface Props {
  primaryColor: string
  siteName: string
  logoUrl: string | null
  logoOnLightUrl: string | null
}

/**
 * Brand colour picker.
 *
 * A single piece of state feeds the presets, the swatch, the hex field, and the
 * preview, so the three controls can never disagree about what will be saved.
 * The previous version had the presets and the colour input both named
 * `primaryColor`, which meant whichever came first in the DOM silently won.
 */
export function ThemeForm({ primaryColor, siteName, logoUrl, logoOnLightUrl }: Props) {
  const [color, setColor] = useState(primaryColor)
  const [text, setText] = useState(primaryColor)
  const { run, pending } = useAction(saveTheme)

  const valid = HEX.test(text)

  const pick = (next: string) => {
    setColor(next)
    setText(next)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData()
        data.set("primaryColor", color)
        run(data)
      }}
      className="space-y-6"
    >
      <Panel
        title="Brand colour"
        description="Used for the header, links, buttons, and focus rings across the portal."
        footer={
          <>
            <span className="mr-auto text-xs text-gray-400">
              {color.toLowerCase() !== primaryColor.toLowerCase() ? "Unsaved changes" : ""}
            </span>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm
                font-medium text-white transition hover:brightness-95 active:brightness-90
                disabled:opacity-60"
            >
              {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              Save theme
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div
            className="grid grid-cols-4 gap-2"
            role="radiogroup"
            aria-label="Brand colour presets"
          >
            {PRESETS.map((preset) => {
              const selected = color.toLowerCase() === preset.color.toLowerCase()
              return (
                <button
                  key={preset.color}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => pick(preset.color)}
                  className="group flex flex-col items-center gap-1.5 rounded-lg p-1 text-left
                    transition focus-visible:outline-none"
                >
                  <span
                    className={`grid h-10 w-full place-items-center rounded-lg ring-2 ring-offset-2
                      transition ${selected ? "ring-gray-900" : "ring-transparent group-hover:ring-gray-300"}`}
                    style={{ backgroundColor: preset.color }}
                  >
                    {/* Always rendered so the swatch height never changes. */}
                    <Check
                      className={`size-4 text-white transition-opacity ${
                        selected ? "opacity-100" : "opacity-0"
                      }`}
                      aria-hidden
                    />
                  </span>
                  <span className="text-center text-xs leading-tight text-gray-500">
                    {preset.name}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="customColor" className="block text-sm font-medium text-gray-700">
              Custom colour
            </label>
            <div className="flex items-center gap-2">
              <input
                id="customColor"
                type="color"
                value={color}
                onChange={(e) => pick(e.target.value)}
                aria-label="Colour picker"
                className="size-9 shrink-0 rounded-lg border border-gray-200 p-0.5"
              />
              <input
                type="text"
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  if (HEX.test(e.target.value)) setColor(e.target.value)
                }}
                aria-label="Hex value"
                aria-invalid={!valid}
                spellCheck={false}
                maxLength={7}
                className={`${inputClass} w-32 font-mono`}
              />
              <p className="text-xs text-gray-400">
                {valid ? "Any #rrggbb value works." : "Needs six hex digits, like #2563eb."}
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Preview" description="Live preview on both surfaces the logo has to survive.">
        <div className="space-y-2">
          <div className="overflow-hidden rounded-lg" style={{ backgroundColor: color }}>
            <div className="flex h-14 items-center gap-6 px-4">
              <BrandLogo logoUrl={logoUrl} siteName={siteName} height={30} />
              <nav className="flex gap-5 text-sm font-medium">
                <span className="text-white">Feed</span>
                <span className="text-white/70">Handbook</span>
                <span className="text-white/70">Contacts</span>
              </nav>
            </div>
          </div>
          <div className="flex h-14 items-center rounded-lg border border-gray-200 bg-white px-4">
            <BrandLogo
              logoUrl={logoUrl}
              logoOnLightUrl={logoOnLightUrl}
              siteName={siteName}
              height={26}
              tone="dark"
            />
          </div>
          <p className="text-xs text-gray-400">
            Top: portal header. Bottom: sign-in screen.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-white transition
                hover:brightness-95"
              style={{ backgroundColor: color }}
            >
              Primary button
            </button>
            <span className="text-sm font-medium" style={{ color }}>
              A link in body text
            </span>
          </div>
        </div>
      </Panel>
    </form>
  )
}
