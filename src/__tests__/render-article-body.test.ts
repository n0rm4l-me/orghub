import { describe, it, expect, vi } from "vitest"

// getPollForEmbed (pulled in transitively via poll-embed-extension.ts ->
// poll-embed-view.tsx) touches the DB; this module never calls it (it only
// builds the schema from the extension definitions, never runs a NodeView),
// but mock it anyway so importing render-article-body.ts can't accidentally
// depend on a live DB connection.
vi.mock("@/lib/db", () => ({ db: {} }))

describe("renderArticleBodyHtml", () => {
  it("renders every node/mark type the admin editor's toolbar can actually produce", async () => {
    const { renderArticleBodyHtml } = await import("@/lib/render-article-body")
    const body = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "A heading" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Plain, " },
            { type: "text", marks: [{ type: "bold" }], text: "bold, " },
            { type: "text", marks: [{ type: "italic" }], text: "italic, " },
            { type: "text", marks: [{ type: "underline" }], text: "underlined, " },
            { type: "text", marks: [{ type: "strike" }], text: "struck, " },
            { type: "text", marks: [{ type: "highlight" }], text: "highlighted, " },
            { type: "text", marks: [{ type: "code" }], text: "code, " },
            { type: "text", marks: [{ type: "link", attrs: { href: "https://example.com", target: null, rel: null, class: null } }], text: "a link" },
            { type: "text", text: "." },
          ],
        },
        { type: "paragraph", attrs: { textAlign: "center" }, content: [{ type: "text", text: "Centered" }] },
        { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "A quote" }] }] },
        { type: "codeBlock", content: [{ type: "text", text: "const x = 1" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Bullet one" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Bullet two" }] }] },
        ]},
        { type: "orderedList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Item one" }] }] },
        ]},
        { type: "horizontalRule" },
        { type: "image", attrs: { src: "/uploads/pic.png", alt: "A pic", title: null, width: 800, height: 450 } },
        { type: "pollEmbed", attrs: { pollId: "poll-123" } },
      ],
    }

    const html = renderArticleBodyHtml(body)

    expect(html).toContain("<h2>A heading</h2>")
    expect(html).toContain("<strong>bold, </strong>")
    expect(html).toContain("<em>italic, </em>")
    expect(html).toContain("underlined, ")
    expect(html).toMatch(/<s>struck, <\/s>|<strike>struck, <\/strike>|<del>struck, <\/del>/)
    expect(html).toContain("highlighted, ")
    expect(html).toContain("<code>code, </code>")
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain("A quote")
    expect(html).toContain("const x = 1")
    expect(html).toContain("Bullet one")
    expect(html).toContain("Item one")
    expect(html).toContain("<hr")
    expect(html).toContain('src="/uploads/pic.png"')
    expect(html).toContain('alt="A pic"')
    expect(html).toContain('width="800"')
    expect(html).toContain('height="450"')
    expect(html).toContain('data-poll-id="poll-123"')
  })

  it("omits width/height on images uploaded before dimensions were tracked", async () => {
    const { renderArticleBodyHtml } = await import("@/lib/render-article-body")
    const html = renderArticleBodyHtml({
      type: "doc",
      content: [{ type: "image", attrs: { src: "/uploads/old.png", alt: null, title: null, width: null, height: null } }],
    })
    expect(html).toContain('src="/uploads/old.png"')
    expect(html).not.toContain("width=")
    expect(html).not.toContain("height=")
  })

  it("does not send the poll node's id through as visible text", async () => {
    const { renderArticleBodyHtml } = await import("@/lib/render-article-body")
    const html = renderArticleBodyHtml({ type: "doc", content: [{ type: "pollEmbed", attrs: { pollId: "poll-456" } }] })
    // The marker is an empty element; nothing but the attribute carries the id.
    expect(html).toBe('<div data-poll-id="poll-456"></div>')
  })

  it("renders an empty doc for null/undefined/non-object body instead of throwing", async () => {
    const { renderArticleBodyHtml } = await import("@/lib/render-article-body")
    expect(renderArticleBodyHtml(null)).toBe("")
    expect(renderArticleBodyHtml(undefined)).toBe("")
    expect(renderArticleBodyHtml("not an object")).toBe("")
  })

  it("returns an empty string instead of throwing for malformed/unrecognized content", async () => {
    const { renderArticleBodyHtml } = await import("@/lib/render-article-body")
    expect(() => renderArticleBodyHtml({ type: "doc", content: [{ type: "not-a-real-node" }] })).not.toThrow()
    expect(renderArticleBodyHtml({ totally: "not a tiptap doc" })).toBe("")
  })

  it("escapes text content instead of letting it inject markup", async () => {
    const { renderArticleBodyHtml } = await import("@/lib/render-article-body")
    const html = renderArticleBodyHtml({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script>" }] }],
    })
    expect(html).not.toContain("<script>alert(1)</script>")
    expect(html).toContain("&lt;script&gt;")
  })

  it("produces the same output on repeated calls (module-level schema/dom reuse is stateless)", async () => {
    const { renderArticleBodyHtml } = await import("@/lib/render-article-body")
    const body = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Stable" }] }] }
    const first = renderArticleBodyHtml(body)
    const second = renderArticleBodyHtml(body)
    expect(first).toBe(second)
    expect(first).toBe("<p>Stable</p>")
  })
})
