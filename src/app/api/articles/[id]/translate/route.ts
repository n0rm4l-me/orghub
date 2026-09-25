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
    if (node.type === "image") {
      const src = node.attrs?.src as string | undefined
      if (src) blocks.push({ type: "image", src, alt: node.attrs?.alt as string | undefined })
      continue
    }
    if (node.type === "pollEmbed") {
      const pollId = node.attrs?.pollId as string | undefined
      if (pollId) blocks.push({ type: "poll", pollId })
      continue
    }
    const text = leafText(node).trim()
    if (!text) continue
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

  // No "list is empty means allow anything" carve-out: matches
  // translateArticle's stricter check in src/lib/actions/translate.ts. An
  // empty translationLanguages can't happen today (DB default is non-empty,
  // saveTranslationSettings refuses to save an empty list), but the two
  // implementations should agree regardless.
  const allowedLangs = (settings.translationLanguages as string).split(",").map((s: string) => s.trim()).filter(Boolean)
  if (!allowedLangs.includes(lang)) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 400 })
  }

  // Everything below can throw on a transient failure (DB connection, cache
  // read, JSON.parse of a corrupt cache row), not just the provider calls;
  // a narrower try/catch here previously let a DB hiccup surface as a raw
  // 500 with no clear error instead of the same "Translation failed" shape
  // every other failure in this route already returns.
  try {
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

    const provider = getProvider(settings.translationProvider)
    // One provider.translate() call per block: see the matching comment in
    // src/lib/actions/translate.ts for why batching multiple blocks into one
    // request and re-splitting the result is unsafe.
    const translatableBlocks = blocks.filter((b) => b.type !== "code" && b.type !== "image" && b.type !== "poll")

    const [translatedTitle, ...translatedTexts] = await Promise.all([
      provider.translate(article.title, lang),
      ...translatableBlocks.map((b) => provider.translate((b as { text: string }).text, lang)),
    ])

    let i = 0
    const translatedBlocks: TranslatedBlock[] = blocks.map((b) =>
      b.type === "code" || b.type === "image" || b.type === "poll" ? b : { ...b, text: translatedTexts[i++] ?? b.text }
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
