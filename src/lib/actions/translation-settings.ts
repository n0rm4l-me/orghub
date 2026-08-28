"use server"

import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { type ActionResult, ok, fail } from "@/lib/actions/types"

const VALID_PROVIDERS = ["mymemory", "deepl", "hf"] as const
const PRESET_LANGS = ["en", "ru", "ja", "zh", "es", "fr", "hi", "uk"] as const

export async function saveTranslationSettings(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN")

  const provider = String(formData.get("translationProvider") ?? "mymemory").trim()
  if (!VALID_PROVIDERS.includes(provider as (typeof VALID_PROVIDERS)[number])) {
    return fail("Invalid provider")
  }

  // Predefined checkboxes
  const presetLangs = PRESET_LANGS.filter((l) => formData.get(`lang_${l}`) === "on")

  // Extra codes from text input — strip whitespace, lowercase, filter non-empty
  const extra = String(formData.get("translationExtraLanguages") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-z]{2,8}(-[a-z0-9]{2,8})*$/i.test(s))

  const langs = [...new Set([...presetLangs, ...extra])]
  if (!langs.length) return fail("Select at least one language")

  await db.siteSettings.update({
    where: { id: "singleton" },
    data: {
      translationProvider: provider,
      translationLanguages: langs.join(","),
    },
  })

  revalidatePath("/admin/modules/translation")
  return ok("Translation settings saved.")
}
