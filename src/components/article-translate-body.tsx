"use client"

import { useState, useTransition } from "react"
import { Loader2, RotateCcw } from "lucide-react"
import { ArticleBody } from "@/components/article-body"
import { translateArticle, type TranslatedBlock } from "@/lib/actions/translate"
import { toast } from "@/components/ui/toaster"

function langLabel(code: string): string {
  try {
    const name = new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return code
  }
}

const PROSE = "prose prose-gray max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 prose-p:leading-relaxed dark:prose-p:text-gray-300"

function renderBlocks(blocks: TranslatedBlock[]) {
  const items = blocks.map((b, i) => {
    if (b.type === "heading") {
      const lvl = Math.min(b.level, 6)
      const text = b.text
      if (lvl === 1) return <h1 key={i}>{text}</h1>
      if (lvl === 2) return <h2 key={i}>{text}</h2>
      if (lvl === 3) return <h3 key={i}>{text}</h3>
      if (lvl === 4) return <h4 key={i}>{text}</h4>
      if (lvl === 5) return <h5 key={i}>{text}</h5>
      return <h6 key={i}>{text}</h6>
    }
    if (b.type === "blockquote") return <blockquote key={i}><p>{b.text}</p></blockquote>
    if (b.type === "code") return <pre key={i}><code>{b.text}</code></pre>
    if (b.type === "image") return <img key={i} src={b.src} alt={b.alt ?? ""} className="rounded-lg" />
    if (b.type === "paragraph") return <p key={i}>{b.text}</p>
    return null
  })

  // Group consecutive bullet/ordered items into lists
  const grouped: React.ReactNode[] = []
  let ulBuffer: TranslatedBlock[] = []
  let olBuffer: TranslatedBlock[] = []

  function flushUl() {
    if (!ulBuffer.length) return
    grouped.push(<ul key={`ul-${grouped.length}`}>{ulBuffer.map((b, i) => <li key={i}>{"text" in b ? b.text : ""}</li>)}</ul>)
    ulBuffer = []
  }
  function flushOl() {
    if (!olBuffer.length) return
    grouped.push(<ol key={`ol-${grouped.length}`}>{olBuffer.map((b, i) => <li key={i}>{"text" in b ? b.text : ""}</li>)}</ol>)
    olBuffer = []
  }

  blocks.forEach((b, i) => {
    if (b.type === "bullet") { flushOl(); ulBuffer.push(b); return }
    if (b.type === "ordered") { flushUl(); olBuffer.push(b); return }
    flushUl(); flushOl()
    grouped.push(items[i])
  })
  flushUl(); flushOl()

  return grouped
}

interface Props {
  articleId: string
  title: string
  bodyJson: unknown
  /** Comma-separated lang codes from settings. When undefined, translation UI is hidden. */
  enabledLanguages?: string
  children?: React.ReactNode
}

export function ArticleTranslateBody({ articleId, title, bodyJson, enabledLanguages, children }: Props) {
  const TARGETS = (enabledLanguages ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((code) => ({ value: code, label: langLabel(code) }))
    .sort((a, b) => a.label.localeCompare(b.label))
  const [target, setTarget] = useState("ru")
  const [shownTarget, setShownTarget] = useState<string | null>(null)
  const [result, setResult] = useState<{ title: string; blocks: TranslatedBlock[] } | null>(null)
  const [showTranslation, setShowTranslation] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleTranslateFor(lang: string) {
    setTarget(lang)
    startTransition(async () => {
      const res = await translateArticle(articleId, lang)
      if (!res.ok) { toast.error(res.error); return }
      setResult({ title: res.translatedTitle, blocks: res.blocks })
      setShownTarget(lang)
      setShowTranslation(true)
    })
  }

  const displayTitle = showTranslation && result ? result.title : title

  return (
    <>
      <h1 key={showTranslation ? `t-${shownTarget}` : "orig"} className="text-3xl font-bold text-gray-900 leading-tight mb-4 dark:text-gray-100 animate-in fade-in-0 duration-300">
        {displayTitle}
      </h1>

      {children}

      {TARGETS.length > 0 && <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {showTranslation && (
          <button
            type="button"
            onClick={() => setShowTranslation(false)}
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <RotateCcw className="size-3" />
            Original
          </button>
        )}
        {TARGETS.map((t) => {
          const isActive = showTranslation && target === t.value
          const isLoading = pending && target === t.value
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => { setTarget(t.value); handleTranslateFor(t.value) }}
              disabled={pending}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition disabled:opacity-60 ${
                isActive
                  ? "border-brand bg-brand/10 font-medium text-brand"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              {isLoading && <Loader2 className="size-3 animate-spin" />}
              {t.label}
            </button>
          )
        })}
      </div>}

      {showTranslation && result ? (
        <div key={shownTarget} className={`${PROSE} animate-in fade-in-0 duration-300`}>{renderBlocks(result.blocks)}</div>
      ) : (
        <ArticleBody body={bodyJson} />
      )}
    </>
  )
}
