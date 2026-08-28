"use client"

import { useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { saveSettings } from "@/lib/actions/settings"
import { useAction } from "@/lib/use-action"
import { BrandLogo } from "@/components/brand-logo"
import { MediaPickerField } from "@/components/media-picker"
import { Field, inputClass } from "@/components/ui/field"

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
  siteName: string
  logoUrl: string | null
  logoOnLightUrl: string | null
  primaryColor: string
}

export function BrandForm({ siteName, logoUrl, logoOnLightUrl, primaryColor }: Props) {
  const [name, setName] = useState(siteName)
  const [logo, setLogo] = useState(logoUrl ?? "")
  const [lightLogo, setLightLogo] = useState(logoOnLightUrl ?? "")
  const [color, setColor] = useState(primaryColor)
  const [colorText, setColorText] = useState(primaryColor)
  const { run, pending } = useAction(saveSettings)

  const dirty =
    name !== siteName ||
    logo !== (logoUrl ?? "") ||
    lightLogo !== (logoOnLightUrl ?? "") ||
    color.toLowerCase() !== primaryColor.toLowerCase()

  const validHex = HEX.test(colorText)

  const pick = (next: string) => {
    setColor(next)
    setColorText(next)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(new FormData(e.currentTarget))
      }}
    >
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="text-sm font-semibold text-gray-900">Brand identity</p>
          <p className="mt-0.5 text-xs text-gray-400">
            Name, logos, and the accent colour used across the portal.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
          {/* Left: inputs */}
          <div className="space-y-5 p-5 md:border-r md:border-gray-100">
            <Field
              label="Site name"
              htmlFor="siteName"
              required
              hint="Appears in the header, browser tab, and email subjects."
            >
              <input
                id="siteName"
                name="siteName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={60}
                placeholder="OrgHub"
                className={inputClass}
              />
            </Field>

            <div>
              <p className="mb-1 text-xs font-medium text-gray-700">Logo for dark background</p>
              <p className="mb-2 text-[11px] text-gray-400">
                Shown in the portal header. Use a light (white) version — it sits on the brand colour.
              </p>
              <input type="hidden" name="logoUrl" value={logo} />
              <MediaPickerField value={logo} onChange={setLogo} tone="dark" />
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-gray-700">Logo for light background</p>
              <p className="mb-2 text-[11px] text-gray-400">
                Shown on the sign-in screen. Use a dark or coloured version — it sits on white.
              </p>
              <input type="hidden" name="logoOnLightUrl" value={lightLogo} />
              <MediaPickerField value={lightLogo} onChange={setLightLogo} />
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-800">Brand colour</p>
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
                      className="group flex flex-col items-center gap-1.5 rounded-lg p-1 transition
                        focus-visible:outline-none"
                    >
                      <span
                        className={`grid h-9 w-full place-items-center rounded-lg ring-2 ring-offset-2
                          transition ${selected ? "ring-gray-900" : "ring-transparent group-hover:ring-gray-300"}`}
                        style={{ backgroundColor: preset.color }}
                      >
                        <Check
                          className={`size-4 text-white transition-opacity ${selected ? "opacity-100" : "opacity-0"}`}
                          aria-hidden
                        />
                      </span>
                      <span className="text-center text-[10px] leading-tight text-gray-500">
                        {preset.name}
                      </span>
                    </button>
                  )
                })}
              </div>

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
                  name="primaryColor"
                  value={colorText}
                  onChange={(e) => {
                    setColorText(e.target.value)
                    if (HEX.test(e.target.value)) pick(e.target.value)
                  }}
                  aria-label="Hex value"
                  aria-invalid={!validHex}
                  spellCheck={false}
                  maxLength={7}
                  className={`${inputClass} w-28 font-mono`}
                />
                <p className="text-xs text-gray-400">
                  {validHex ? "Any #rrggbb value." : "Needs #rrggbb format."}
                </p>
              </div>
            </div>
          </div>

          {/* Right: live preview */}
          <div className="bg-white p-5 md:sticky md:top-0 md:self-start">
            <p className="mb-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Preview</p>
            <div className="space-y-2">
              <div className="overflow-hidden rounded-lg" style={{ backgroundColor: color }}>
                <div className="flex h-12 items-center gap-4 px-3">
                  <BrandLogo key={`h-${logo}`} logoUrl={logo || null} siteName={name || "OrgHub"} height={26} />
                  <nav className="flex gap-4 text-xs font-medium">
                    <span className="text-white">Feed</span>
                    <span className="text-white/60">Handbook</span>
                  </nav>
                </div>
              </div>
              <div className="flex h-12 items-center rounded-lg border border-gray-200 bg-white px-3">
                <BrandLogo
                  key={`l-${lightLogo}`}
                  logoUrl={logo || null}
                  logoOnLightUrl={lightLogo || null}
                  siteName={name || "OrgHub"}
                  height={22}
                  tone="dark"
                />
              </div>
              <p className="text-[10px] text-gray-400">Top: portal header. Bottom: sign-in screen.</p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                  style={{ backgroundColor: color }}
                >
                  Primary button
                </button>
                <span className="text-xs font-medium" style={{ color }}>
                  A link in text
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
          <span className="text-xs text-gray-400">
            {dirty ? "Unsaved changes" : ""}
          </span>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm
              font-medium text-white transition hover:brightness-95 active:brightness-90
              disabled:opacity-60"
          >
            {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            Save branding
          </button>
        </div>
      </div>
    </form>
  )
}
