"use client"

import { useState } from "react"
import { Loader2, Check } from "lucide-react"
import { saveTranslationSettings } from "@/lib/actions/translation-settings"
import { useAction } from "@/lib/use-action"

const PROVIDERS = [
  { value: "mymemory", label: "MyMemory", hint: "Free (requires MYMEMORY_EMAIL for 10k words/day)" },
  { value: "deepl", label: "DeepL", hint: "Requires DEEPL_API_KEY" },
  { value: "hf", label: "Hugging Face", hint: "Requires HF_TOKEN (Helsinki-NLP models)" },
]

const PRESET_LANGS = [
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "hi", label: "हिन्दी" },
  { value: "uk", label: "Українська" },
]

const PRESET_CODES = new Set(PRESET_LANGS.map((l) => l.value))

interface Props {
  provider: string
  languages: string
}

export function TranslationSettingsForm({ provider: initProvider, languages: initLanguages }: Props) {
  const initCodes = initLanguages.split(",").map((s) => s.trim()).filter(Boolean)
  const initPreset = new Set(initCodes.filter((c) => PRESET_CODES.has(c)))
  const initExtra = initCodes.filter((c) => !PRESET_CODES.has(c)).join(", ")

  const [provider, setProvider] = useState(initProvider)
  const [langs, setLangs] = useState<Set<string>>(initPreset)
  const [extra, setExtra] = useState(initExtra)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const { run, pending } = useAction(saveTranslationSettings, {
    onSuccess: () => setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
  })

  function toggleLang(lang: string) {
    setLangs((prev) => {
      const next = new Set(prev)
      if (next.has(lang)) next.delete(lang)
      else next.add(lang)
      return next
    })
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("translationExtraLanguages", extra)
    run(fd)
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-gray-200 bg-white px-5 py-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Settings</h2>

      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-medium text-gray-700">Translation provider</p>
          <div className="space-y-1.5">
            {PROVIDERS.map((p) => (
              <label
                key={p.value}
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition ${
                  provider === p.value
                    ? "border-brand bg-brand/5"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="translationProvider"
                  value={p.value}
                  checked={provider === p.value}
                  onChange={() => setProvider(p.value)}
                  className="mt-0.5 accent-brand"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.label}</p>
                  <p className="text-xs text-gray-400">{p.hint}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-gray-700">Available languages</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_LANGS.map((l) => (
              <label
                key={l.value}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                  langs.has(l.value)
                    ? "border-brand bg-brand/10 font-medium text-brand"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  name={`lang_${l.value}`}
                  checked={langs.has(l.value)}
                  onChange={() => toggleLang(l.value)}
                  className="sr-only"
                />
                {l.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Additional languages
          </label>
          <input
            type="text"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="pt, ko, ar, de, ..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900
              outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
          <p className="mt-1 text-xs text-gray-400">
            BCP-47 language codes, comma-separated. Names are resolved automatically.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm
              font-medium text-white transition hover:bg-brand/90 disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Save
          </button>
          {savedAt && (
            <span className="text-xs text-gray-400">Saved {savedAt}</span>
          )}
        </div>
      </div>
    </form>
  )
}
