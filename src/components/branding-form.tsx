"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { saveSettings } from "@/lib/actions/settings"
import { useAction } from "@/lib/use-action"
import { BrandLogo } from "@/components/brand-logo"
import { Field, Panel, inputClass } from "@/components/ui/field"

interface Props {
  siteName: string
  logoUrl: string | null
  logoOnLightUrl: string | null
  primaryColor: string
}

/**
 * Branding editor with a live preview.
 *
 * The preview is driven by local state rather than the saved settings, so the
 * effect of a change is visible before committing it. The preview reuses the real
 * header component, which means a broken logo URL degrades here exactly as it
 * would in production instead of looking fine until deploy.
 */
export function BrandingForm({ siteName, logoUrl, logoOnLightUrl, primaryColor }: Props) {
  const [name, setName] = useState(siteName)
  const [logo, setLogo] = useState(logoUrl ?? "")
  const [lightLogo, setLightLogo] = useState(logoOnLightUrl ?? "")
  const { run, pending } = useAction(saveSettings)

  const dirty =
    name !== siteName ||
    logo !== (logoUrl ?? "") ||
    lightLogo !== (logoOnLightUrl ?? "")

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(new FormData(e.currentTarget))
      }}
      className="space-y-6"
    >
      <Panel
        title="Identity"
        description="How the portal introduces itself in the header and the browser tab."
        footer={
          <>
            <span className="mr-auto text-xs text-gray-400">
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
          </>
        }
      >
        <div className="space-y-5">
          <Field
            label="Site name"
            htmlFor="siteName"
            required
            hint="Appears in the header, the browser tab, and email subjects."
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

          <Field
            label="Header logo URL"
            htmlFor="logoUrl"
            hint="Direct link to a PNG, SVG, or WebP. Sits on the brand colour, so this is normally the white version. Leave empty to use a lettermark built from the site name."
          >
            <input
              id="logoUrl"
              name="logoUrl"
              type="url"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://example.com/logo-white.svg"
              className={inputClass}
              spellCheck={false}
            />
          </Field>

          <Field
            label="Logo URL for white backgrounds"
            htmlFor="logoOnLightUrl"
            hint="Used on the sign-in screen. Leave empty to show the lettermark there: a white header logo would be invisible on the card."
          >
            <input
              id="logoOnLightUrl"
              name="logoOnLightUrl"
              type="url"
              value={lightLogo}
              onChange={(e) => setLightLogo(e.target.value)}
              placeholder="https://example.com/logo-colour.svg"
              className={inputClass}
              spellCheck={false}
            />
          </Field>
        </div>
      </Panel>

      <Panel
        title="Preview"
        description="Rendered with the live values above, on both backgrounds the logo has to survive."
      >
        <div className="space-y-3">
          <div
            className="flex h-14 items-center rounded-lg px-4"
            style={{ backgroundColor: primaryColor }}
          >
            {/* Keyed on the URL so editing it remounts the loader and re-runs the
                loading / failed states instead of keeping a stale verdict. */}
            <BrandLogo key={`onbrand-${logo}`} logoUrl={logo || null} siteName={name || "OrgHub"} height={30} />
          </div>
          <div className="flex h-14 items-center rounded-lg border border-gray-200 bg-white px-4">
            <BrandLogo
              key={`onlight-${lightLogo}`}
              logoUrl={logo || null}
              logoOnLightUrl={lightLogo || null}
              siteName={name || "OrgHub"}
              height={26}
              tone="dark"
            />
          </div>
          <p className="text-xs text-gray-400">
            Top: the portal header and admin sidebar. Bottom: the sign-in screen.
          </p>
        </div>
      </Panel>
    </form>
  )
}
