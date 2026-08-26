"use client"

import { useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import { PollEmbed } from "@/components/poll-embed-extension"
import { getActivePollsForInsert } from "@/lib/actions/polls"
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code2, Minus,
  AlignLeft, AlignCenter, AlignRight,
  Highlighter, Link2, Image as ImageIcon,
  Undo, Redo, BarChart2,
} from "lucide-react"

interface Props {
  initialContent?: object
  onChange: (json: object) => void
}

export const EDITOR_EXTENSIONS = [
  StarterKit.configure({ link: false, underline: false }),
  Underline,
  Highlight,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Image,
  Link.configure({ openOnClick: false }),
  PollEmbed,
]

export function Editor({ initialContent, onChange }: Props) {
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
      <Toolbar editor={editor} />
      <div className="px-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
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
      {btn(
        false,
        () => {
          const url = window.prompt("Image URL:")
          if (url) editor.chain().focus().setImage({ src: url }).run()
        },
        ImageIcon,
        "Image"
      )}
      {divider}
      {btn(false, () => editor.chain().focus().undo().run(), Undo, "Undo")}
      {btn(false, () => editor.chain().focus().redo().run(), Redo, "Redo")}
      {divider}
      <InsertPollButton editor={editor} />
    </div>
  )
}

function InsertPollButton({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [open, setOpen] = useState(false)
  const [polls, setPolls] = useState<Array<{ id: string; question: string }> | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleOpen() {
    if (open) { setOpen(false); return }
    setOpen(true)
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

  return (
    <div className="relative">
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
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[200px] max-w-xs overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <p className="px-3 py-2 text-xs text-gray-400">Loading polls...</p>
          ) : !polls?.length ? (
            <p className="px-3 py-2 text-xs text-gray-400">No active polls found.</p>
          ) : (
            <ul>
              {polls.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => insert(p.id)}
                    className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 line-clamp-2"
                  >
                    {p.question}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
