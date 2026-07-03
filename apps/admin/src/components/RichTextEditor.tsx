"use client";

import { useState, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  LinkIcon,
  UnlinkIcon,
  Undo2Icon,
  Redo2Icon,
} from "lucide-react";
import URLAutocomplete from "./URLAutocomplete";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Tulis konten di sini...",
  minHeight = 200,
  maxHeight = 500,
}: RichTextEditorProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpenInNewTab, setLinkOpenInNewTab] = useState(false);
  const linkDialogRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: { class: "rich-text-editor-content" },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (linkDialogRef.current && !linkDialogRef.current.contains(e.target as Node)) {
        setLinkDialogOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!editor) return null;

  const openLinkDialog = () => {
    const attrs = editor.getAttributes("link");
    setLinkUrl(attrs.href || "");
    setLinkOpenInNewTab(attrs.target === "_blank");
    setLinkDialogOpen(true);
  };

  const applyLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .setLink({ href: linkUrl.trim(), target: linkOpenInNewTab ? "_blank" : undefined })
        .run();
    }
    setLinkDialogOpen(false);
    setLinkUrl("");
    setLinkOpenInNewTab(false);
  };

  const removeLink = () => {
    editor.chain().focus().unsetLink().run();
    setLinkDialogOpen(false);
    setLinkUrl("");
    setLinkOpenInNewTab(false);
  };

  const isLinkActive = editor.isActive("link");

  return (
    <div className="rich-text-editor">
      {/* Toolbar */}
      <div className="rich-text-toolbar">
        {/* Inline */}
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "is-active" : ""} title="Bold (Ctrl+B)">
          <BoldIcon className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "is-active" : ""} title="Italic (Ctrl+I)">
          <ItalicIcon className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive("strike") ? "is-active" : ""} title="Strikethrough">
          <StrikethroughIcon className="w-4 h-4" />
        </button>

        <div className="rich-text-toolbar-divider" />

        {/* Headings */}
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "is-active" : ""} title="Heading 2">
          <Heading2Icon className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive("heading", { level: 3 }) ? "is-active" : ""} title="Heading 3">
          <Heading3Icon className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          className={editor.isActive("heading", { level: 4 }) ? "is-active" : ""} title="Heading 4">
          <Heading4Icon className="w-4 h-4" />
        </button>

        <div className="rich-text-toolbar-divider" />

        {/* Lists */}
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "is-active" : ""} title="Bullet List">
          <ListIcon className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "is-active" : ""} title="Ordered List">
          <ListOrderedIcon className="w-4 h-4" />
        </button>

        <div className="rich-text-toolbar-divider" />

        {/* Block */}
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "is-active" : ""} title="Blockquote">
          <QuoteIcon className="w-4 h-4" />
        </button>

        {/* Link */}
        <button type="button" onClick={isLinkActive ? removeLink : openLinkDialog}
          className={isLinkActive ? "is-active" : ""} title={isLinkActive ? "Hapus Link" : "Tambah Link"}>
          {isLinkActive ? <UnlinkIcon className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
        </button>

        <div className="rich-text-toolbar-divider" />

        {/* History */}
        <button type="button" onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
          <Undo2Icon className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
          <Redo2Icon className="w-4 h-4" />
        </button>
      </div>

      {/* Link Dialog */}
      {linkDialogOpen && (
        <div ref={linkDialogRef} className="rich-text-link-dialog">
          <div className="rich-text-link-dialog-label">URL Tautan</div>
          <URLAutocomplete
            value={linkUrl}
            onChange={setLinkUrl}
            placeholder="Pilih halaman atau ketik URL eksternal..."
          />
          <label className="rich-text-link-dialog-newtab">
            <input
              type="checkbox"
              checked={linkOpenInNewTab}
              onChange={(e) => setLinkOpenInNewTab(e.target.checked)}
            />
            <span>Buka di tab baru</span>
          </label>
          <div className="rich-text-link-dialog-actions">
            <button type="button" className="rich-text-link-btn-apply" onClick={applyLink}>
              Simpan
            </button>
            {isLinkActive && (
              <button type="button" className="rich-text-link-btn-remove" onClick={removeLink}>
                Hapus Link
              </button>
            )}
            <button type="button" className="rich-text-link-btn-cancel"
              onClick={() => setLinkDialogOpen(false)}>
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <EditorContent editor={editor} style={{ minHeight, maxHeight }} />
    </div>
  );
}
