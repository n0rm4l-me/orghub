"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code2, Minus,
  AlignLeft, AlignCenter, AlignRight,
  Highlighter, Link2, Image as ImageIcon,
  Undo, Redo,
} from "lucide-react"

interface Props {
  initialContent?: object
  onChange: (json: object) => void
}

export function Editor({ initialContent, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Start writing your article..." }),
      Image,
      Link.configure({ openOnClick: false }),
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
    </div>
  )
}
