import { JSDOM } from "jsdom"
import { getSchema } from "@tiptap/core"
import { DOMSerializer, Node as PMNode } from "@tiptap/pm/model"
import { SCHEMA_EXTENSIONS } from "@/lib/schema-extensions"

/**
 * Server-side equivalent of ArticleBody's client-side `useEditor` +
 * `EditorContent` (editable: false), for the read-only public render path.
 *
 * `@tiptap/core`'s own `generateHTML()` can't be used directly: its
 * internal `getHTMLFromFragment` reads the bare `document` global with no
 * way to inject one (confirmed by reading its source), so it throws
 * "window is not defined" in Node with nothing polyfilled. The lower-level
 * ProseMirror API this file calls instead (`DOMSerializer.serializeFragment`)
 * *does* accept an explicit `{ document }` option, which is what actually
 * makes this safe to run in a server process handling concurrent requests:
 * nothing here ever touches `global.window`/`global.document`, so there's
 * no shared mutable state for two in-flight requests to step on.
 *
 * The schema and the jsdom document are both built once at module load,
 * not per call: building a schema is pure metadata with no DOM involved,
 * and reusing one jsdom `document` as a plain `createElement` factory
 * across calls is safe (each call only ever creates and reads its own new,
 * detached node tree; nothing here reads or writes any state shared
 * between them, e.g. `document.title`), and considerably cheaper than
 * constructing a new jsdom environment on every article view.
 */
const schema = getSchema(SCHEMA_EXTENSIONS)
const dom = new JSDOM("")

export function renderArticleBodyHtml(body: unknown): string {
  const doc = body && typeof body === "object" ? body : { type: "doc", content: [] }

  let contentNode: PMNode
  try {
    contentNode = PMNode.fromJSON(schema, doc)
  } catch {
    // Malformed or pre-schema-change body content: fail this one article's
    // render, not the whole page.
    return ""
  }

  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(
    contentNode.content,
    { document: dom.window.document as unknown as Document },
  )
  const container = dom.window.document.createElement("div")
  container.appendChild(fragment as unknown as globalThis.Node)
  return container.innerHTML
}
