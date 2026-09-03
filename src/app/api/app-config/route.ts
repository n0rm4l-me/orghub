import { db } from "@/lib/db"
import { parseModules } from "@/lib/modules"

export async function GET() {
  const s = await db.siteSettings.findUnique({
    where: { id: "singleton" },
    select: {
      siteName: true,
      logoUrl: true,
      logoOnLightUrl: true,
      primaryColor: true,
      enabledModules: true,
      translationLanguages: true,
    },
  })

  const enabled = parseModules(s?.enabledModules)

  return Response.json({
    siteName: s?.siteName ?? "OrgHub",
    logoUrl: s?.logoUrl ?? null,
    logoOnLightUrl: s?.logoOnLightUrl ?? null,
    primaryColor: s?.primaryColor ?? "#2563eb",
    enabledModules: Array.from(enabled),
    translationLanguages: enabled.has("translation") ? (s?.translationLanguages ?? "") : "",
  })
}
