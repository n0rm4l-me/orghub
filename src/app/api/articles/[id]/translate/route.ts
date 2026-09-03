import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getMobileUser } from "@/lib/mobile-auth"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { getProvider } from "@/lib/translation"
import type { TranslatedBlock } from "@/lib/actions/translate"

type TiptapNode = { type: string; text?: string; attrs?: Record<string, unknown>; content?: TiptapNode[] }

function leafText(node: TiptapNode): string {
  if (node.text) return node.text
  return (node.content ?? []).map(leafText).join("")
}

function extractBlocks(doc: TiptapNode): TranslatedBlock[] {
  const blocks: TranslatedBlock[] = []
  for (const node of doc.content ?? []) {
    const text = leafText(node).trim()
    if (!text && node.type !== "image") continue
    if (node.type === "heading") {
      blocks.push({ type: "heading", level: (node.attrs?.level as number) ?? 2, text })
    } else if (node.type === "paragraph") {
      blocks.push({ type: "paragraph", text })
    } else if (node.type === "codeBlock") {
      blocks.push({ type: "code", text })
    } else if (node.type === "blockquote") {
      blocks.push({ type: "blockquote", text })
    } else if (node.type === "bulletList") {
      for (const item of node.content ?? []) {
        const t = leafText(item).trim()
        if (t) blocks.push({ type: "bullet", text: t })
      }
    } else if (node.type === "orderedList") {
      for (const item of node.content ?? []) {
        const t = leafText(item).trim()
        if (t) blocks.push({ type: "ordered", text: t })
      }
    } else if (node.type === "image") {
      const src = node.attrs?.src as string | undefined
      if (src) blocks.push({ type: "image", src, alt: node.attrs?.alt as string | undefined })
    }
  }
  return blocks
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getMobileUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const lang = req.nextUrl.searchParams.get("lang")
  if (!lang) return NextResponse.json({ error: "lang required" }, { status: 400 })

  const settings = await getSettings()
  const enabled = parseModules(settings.enabledModules)
  if (!enabled.has("translation")) return NextResponse.json({ error: "Translation disabled" }, { status: 403 })

  const allowedLangs = (settings.translationLanguages as string).split(",").map((s: string) => s.trim()).filter(Boolean)
  if (allowedLangs.length > 0 && !allowedLangs.includes(lang)) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 400 })
  }

  const article = await db.article.findFirst({
    where: { id, published: true },
    select: { title: true, body: true },
  })
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const cached = await db.articleTranslation.findUnique({
    where: { articleId_lang: { articleId: id, lang } },
    select: { title: true, body: true },
  })
  if (cached) {
    return NextResponse.json({ ok: true, translatedTitle: cached.title, blocks: JSON.parse(cached.body) })
  }

  const blocks = extractBlocks(article.body as TiptapNode)
  if (!blocks.length) return NextResponse.json({ error: "No content" }, { status: 422 })

  try {
    const provider = getProvider(settings.translationProvider)
    const translatableBlocks = blocks.filter((b) => b.type !== "code" && b.type !== "image")
    const bodyText = translatableBlocks.map((b) => b.text).join("\n\n")

    const paragraphs = bodyText.split("\n\n")
    const chunks: string[] = []
    let current = ""
    for (const para of paragraphs) {
      const sep = current ? "\n\n" : ""
      if ((current + sep + para).length <= 450 || !current) {
        current += sep + para
      } else {
        chunks.push(current)
        current = para
      }
    }
    if (current) chunks.push(current)

    const [translatedTitle, ...chunkResults] = await Promise.all([
      provider.translate(article.title, lang),
      ...chunks.map((c) => provider.translate(c, lang)),
    ])

    const translatedTexts = chunkResults.join("\n\n").split(/\n\n+/)
    let i = 0
    const translatedBlocks: TranslatedBlock[] = blocks.map((b) =>
      b.type === "code" || b.type === "image" ? b : { ...b, text: translatedTexts[i++] ?? b.text }
    )

    await db.articleTranslation.upsert({
      where: { articleId_lang: { articleId: id, lang } },
      create: { articleId: id, lang, title: translatedTitle, body: JSON.stringify(translatedBlocks) },
      update: { title: translatedTitle, body: JSON.stringify(translatedBlocks) },
    })

    return NextResponse.json({ ok: true, translatedTitle, blocks: translatedBlocks })
  } catch {
    return NextResponse.json({ error: "Translation failed" }, { status: 500 })
  }
}
