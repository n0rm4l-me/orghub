"use server"

import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { getProvider } from "@/lib/translation"

export type TranslatedBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }
  | { type: "ordered"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "code"; text: string }
  | { type: "image"; src: string; alt?: string }

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

export async function translateArticle(
  articleId: string,
  target: string,
): Promise<{ ok: true; translatedTitle: string; blocks: TranslatedBlock[] } | { ok: false; error: string }> {
  await requireRole("VIEWER")
  const settings = await getSettings()

  const enabled = parseModules(settings.enabledModules)
  if (!enabled.has("translation")) return { ok: false, error: "Translation module is disabled" }

  const allowedLangs = (settings.translationLanguages as string).split(",").map((s: string) => s.trim()).filter(Boolean)
  if (!allowedLangs.includes(target)) return { ok: false, error: "Unsupported target language" }

  const article = await db.article.findUnique({
    where: { id: articleId, published: true },
    select: { title: true, body: true },
  })
  if (!article) return { ok: false, error: "Article not found" }

  // Check DB cache first
  const cached = await db.articleTranslation.findUnique({
    where: { articleId_lang: { articleId, lang: target } },
    select: { title: true, body: true },
  })
  if (cached) {
    return {
      ok: true,
      translatedTitle: cached.title,
      blocks: JSON.parse(cached.body) as TranslatedBlock[],
    }
  }

  const blocks = extractBlocks(article.body as TiptapNode)
  if (!blocks.length) return { ok: false, error: "Article has no text content" }

  try {
    const provider = getProvider(settings.translationProvider)

    const translatableBlocks = blocks.filter((b) => b.type !== "code" && b.type !== "image")
    const bodyText = translatableBlocks.map((b) => b.text).join("\n\n")

    // Chunk body into ≤450-char segments split on paragraph boundaries
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
      provider.translate(article.title, target),
      ...chunks.map((c) => provider.translate(c, target)),
    ])

    const translatedTexts = chunkResults.join("\n\n").split(/\n\n+/)
    let i = 0
    const translatedBlocks: TranslatedBlock[] = blocks.map((b) =>
      b.type === "code" || b.type === "image" ? b : { ...b, text: translatedTexts[i++] ?? b.text }
    )

    // Persist to DB cache
    await db.articleTranslation.upsert({
      where: { articleId_lang: { articleId, lang: target } },
      create: { articleId, lang: target, title: translatedTitle, body: JSON.stringify(translatedBlocks) },
      update: { title: translatedTitle, body: JSON.stringify(translatedBlocks) },
    })

    return { ok: true, translatedTitle, blocks: translatedBlocks }
  } catch {
    return { ok: false, error: "Translation failed. Please try again." }
  }
}
