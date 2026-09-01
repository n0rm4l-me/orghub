"use client"

import { useState, useRef, useEffect } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Link from "@tiptap/extension-link"
import { PollEmbed } from "@/components/poll-embed-extension"
import { ImageEmbed } from "@/components/image-embed-extension"
import { getActivePollsForInsert } from "@/lib/actions/polls"
import { getMediaList } from "@/lib/actions/media"
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code2, Minus,
  AlignLeft, AlignCenter, AlignRight,
  Highlighter, Link2, Image as ImageIcon,
  Undo, Redo, BarChart2, Loader2, Upload,
} from "lucide-react"

interface Props {
  initialContent?: object
  onChange: (json: object) => void
  folder?: string
}

export const EDITOR_EXTENSIONS = [
  StarterKit.configure({ link: false, underline: false }),
  Underline,
  Highlight,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  ImageEmbed,
  Link.configure({ openOnClick: false }),
  PollEmbed,
]

export function Editor({ initialContent, onChange, folder }: Props) {
  const editor = useEditor({
    extensions: [
      ...EDITOR_EXTENSIONS,
      Placeholder.configure({ placeholder: "Start writing your article..." }),
    ],
    content: initialContent ?? { type: "doc", content: [{ type: "paragraph" }] },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: {
        class:
          "prose prose-gray max-w-none min-h-[400px] focus:outline-none px-0 py-4 text-gray-800 prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed",
      },
    },
  })

  if (!editor) return null

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <Toolbar editor={editor} folder={folder} />
      <div className="px-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function Toolbar({ editor, folder }: { editor: ReturnType<typeof useEditor>; folder?: string }) {
  if (!editor) return null

  const btn = (
    active: boolean,
    onClick: () => void,
    Icon: React.ElementType,
    title: string
  ) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition ${
        active
          ? "bg-blue-100 text-blue-700"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  )

  const divider = <div className="w-px h-5 bg-gray-200 mx-1" />

  return (
    <div className="flex items-center gap-0.5 px-4 py-2.5 border-b border-gray-100 flex-wrap bg-gray-50/50">
      {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), Bold, "Bold")}
      {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), Italic, "Italic")}
      {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), UnderlineIcon, "Underline")}
      {btn(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), Strikethrough, "Strikethrough")}
      {btn(editor.isActive("highlight"), () => editor.chain().focus().toggleHighlight().run(), Highlighter, "Highlight")}
      {divider}
      {btn(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), Heading1, "H1")}
      {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), Heading2, "H2")}
      {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), Heading3, "H3")}
      {divider}
      {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), List, "Bullet list")}
      {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), ListOrdered, "Numbered list")}
      {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), Quote, "Quote")}
      {btn(editor.isActive("code"), () => editor.chain().focus().toggleCode().run(), Code2, "Code")}
      {btn(false, () => editor.chain().focus().setHorizontalRule().run(), Minus, "Divider")}
      {divider}
      {btn(editor.isActive({ textAlign: "left" }), () => editor.chain().focus().setTextAlign("left").run(), AlignLeft, "Align left")}
      {btn(editor.isActive({ textAlign: "center" }), () => editor.chain().focus().setTextAlign("center").run(), AlignCenter, "Align center")}
      {btn(editor.isActive({ textAlign: "right" }), () => editor.chain().focus().setTextAlign("right").run(), AlignRight, "Align right")}
      {divider}
      {btn(
        editor.isActive("link"),
        () => {
          const url = window.prompt("URL:")
          if (url) editor.chain().focus().setLink({ href: url }).run()
        },
        Link2,
        "Link"
      )}
      <InsertImageButton editor={editor} folder={folder} />
      {divider}
      {btn(false, () => editor.chain().focus().undo().run(), Undo, "Undo")}
      {btn(false, () => editor.chain().focus().redo().run(), Redo, "Redo")}
      {divider}
      <InsertPollButton editor={editor} />
    </div>
  )
}

function InsertImageButton({ editor, folder }: { editor: ReturnType<typeof useEditor>; folder?: string }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [media, setMedia] = useState<Array<{ id: string; url: string; filename: string; mimeType: string }> | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  async function handleOpen() {
    if (open) { setOpen(false); return }
    setOpen(true)
    setQuery("")
    if (media !== null) return
    setLoading(true)
    const result = await getMediaList(1, "")
    setMedia(result.rows.filter((r) => r.mimeType.startsWith("image/")))
    setLoading(false)
  }

  function insert(url: string) {
    editor?.chain().focus().setImage({ src: url }).run()
    setOpen(false)
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.set("file", files[0])
      if (folder) fd.set("folder", folder)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (res.ok) {
        insert(data.url)
        setMedia(null) // reset cache so next open re-fetches
      }
    } finally {
      setUploading(false)
    }
  }

  const filtered = (media ?? []).filter((m) =>
    m.filename.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="relative" ref={ref}>
      <input ref={fileRef} type="file" accept="image/*" className="sr-only"
        onChange={(e) => handleUpload(e.target.files)} />
      <button
        type="button"
        onClick={handleOpen}
        title="Insert image"
        className="p-1.5 rounded transition text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      >
        <ImageIcon className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-gray-100 px-2 py-1.5">
            <input
              autoFocus
              type="text"
              placeholder="Search images…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-w-0 flex-1 rounded px-2 py-1 text-xs text-gray-700 outline-none placeholder:text-gray-400 focus:bg-gray-50"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex shrink-0 items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
              Upload
            </button>
          </div>
          {loading ? (
            <p className="px-3 py-3 text-xs text-gray-400">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-3 text-xs text-gray-400">
              {query ? "No matches." : "No images uploaded yet."}
            </p>
          ) : (
            <div className="grid max-h-60 grid-cols-3 gap-1 overflow-y-auto p-2">
              {filtered.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => insert(m.url)}
                  className="group overflow-hidden rounded border border-gray-100 hover:border-brand transition"
                  title={m.filename}
                >
                  <img src={m.url} alt={m.filename} className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InsertPollButton({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [open, setOpen] = useState(false)
  const [polls, setPolls] = useState<Array<{ id: string; question: string }> | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  async function handleOpen() {
    if (open) { setOpen(false); return }
    setOpen(true)
    setQuery("")
    if (polls !== null) return
    setLoading(true)
    const result = await getActivePollsForInsert()
    setPolls(result)
    setLoading(false)
  }

  function insert(pollId: string) {
    editor?.chain().focus().insertContent({ type: "pollEmbed", attrs: { pollId } }).run()
    setOpen(false)
  }

  const filtered = polls?.filter((p) =>
    p.question.toLowerCase().includes(query.toLowerCase())
  ) ?? []

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        title="Insert poll"
        className="flex items-center gap-1 rounded px-1.5 py-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 text-xs"
      >
        <BarChart2 className="w-4 h-4" />
        Poll
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <p className="px-3 py-2 text-xs text-gray-400">Loading polls...</p>
          ) : !polls?.length ? (
            <p className="px-3 py-2 text-xs text-gray-400">No active polls found.</p>
          ) : (
            <>
              <div className="border-b border-gray-100 px-2 py-1.5">
                <input
                  autoFocus
                  type="text"
                  placeholder="Search polls…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded px-2 py-1 text-xs text-gray-700 outline-none placeholder:text-gray-400 focus:bg-gray-50"
                />
              </div>
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-400">No matches.</p>
              ) : (
                <ul className="max-h-52 overflow-y-auto">
                  {filtered.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => insert(p.id)}
                        className="w-full truncate px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                      >
                        {p.question}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
