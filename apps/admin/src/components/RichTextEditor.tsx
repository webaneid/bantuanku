"use client";

import { useState, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Blockquote } from "@tiptap/extension-blockquote";
import Link from "@tiptap/extension-link";
import { Table, TableCell, TableHeader } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
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
  TableIcon,
  ImageIcon,
  LayoutTemplateIcon,
  Undo2Icon,
  Redo2Icon,
} from "lucide-react";
import URLAutocomplete from "./URLAutocomplete";
import { FigureNode } from "./editor/FigureNode";
import { CtaBlock } from "./editor/CtaBlock";

// Blockquote extended with citation attribute (data-citation)
const BlockquoteWithCitation = Blockquote.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      citation: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-citation") || null,
        renderHTML: (attrs) =>
          attrs.citation ? { "data-citation": attrs.citation } : {},
      },
    };
  },
});

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
  // Link dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpenInNewTab, setLinkOpenInNewTab] = useState(false);
  const linkDialogRef = useRef<HTMLDivElement>(null);

  // Citation dialog state
  const [citationDialogOpen, setCitationDialogOpen] = useState(false);
  const [citationText, setCitationText] = useState("");
  const citationDialogRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        blockquote: false,
      }),
      BlockquoteWithCitation,
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      FigureNode,
      CtaBlock,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "rich-text-editor-content" },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  // Close dialogs on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (linkDialogRef.current && !linkDialogRef.current.contains(e.target as Node)) {
        setLinkDialogOpen(false);
      }
      if (citationDialogRef.current && !citationDialogRef.current.contains(e.target as Node)) {
        setCitationDialogOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  if (!editor) return null;

  // ── Link helpers ──────────────────────────────────────────────────────────
  const isLinkActive = editor.isActive("link");

  const openLinkDialog = () => {
    const attrs = editor.getAttributes("link");
    setLinkUrl(attrs.href || "");
    setLinkOpenInNewTab(attrs.target === "_blank");
    setCitationDialogOpen(false);
    setLinkDialogOpen(true);
  };

  const applyLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({
        href: linkUrl.trim(),
        target: linkOpenInNewTab ? "_blank" : undefined,
      }).run();
    }
    setLinkDialogOpen(false);
    setLinkUrl("");
    setLinkOpenInNewTab(false);
  };

  const removeLink = () => {
    editor.chain().focus().unsetLink().run();
    setLinkDialogOpen(false);
    setLinkUrl("");
  };

  // ── Citation helpers ──────────────────────────────────────────────────────
  const isBlockquoteActive = editor.isActive("blockquote");

  const openCitationDialog = () => {
    const attrs = editor.getAttributes("blockquote");
    setCitationText(attrs.citation || "");
    setLinkDialogOpen(false);
    setCitationDialogOpen(true);
  };

  const applyCitation = () => {
    editor.chain().focus().updateAttributes("blockquote", {
      citation: citationText.trim() || null,
    }).run();
    setCitationDialogOpen(false);
  };

  // ── Table helpers ─────────────────────────────────────────────────────────
  const isInTable = editor.isActive("table");

  const insertTable = () =>
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();

  const insertFigure = () =>
    editor.chain().focus().insertContent({ type: "figure", attrs: { src: null, alt: "", caption: "" } }).run();

  const insertCta = () =>
    editor.chain().focus().insertContent({ type: "ctaBlock", attrs: { title: "", description: "", buttonText: "", buttonUrl: "" } }).run();

  return (
    <div className="rich-text-editor">
      {/* ── Main Toolbar ──────────────────────────────────────────────────── */}
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

        {/* Block: Blockquote + Citation */}
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={isBlockquoteActive ? "is-active" : ""} title="Blockquote">
          <QuoteIcon className="w-4 h-4" />
        </button>
        {isBlockquoteActive && (
          <button type="button" onClick={openCitationDialog}
            className={`rich-text-toolbar-cite ${editor.getAttributes("blockquote").citation ? "is-active" : ""}`}
            title="Tambah Sumber Kutipan">
            <span>— cite</span>
          </button>
        )}

        {/* Table */}
        <button type="button" onClick={insertTable}
          className={isInTable ? "is-active" : ""} title="Sisipkan Tabel">
          <TableIcon className="w-4 h-4" />
        </button>

        {/* Link */}
        <button type="button"
          onClick={isLinkActive ? removeLink : openLinkDialog}
          className={isLinkActive ? "is-active" : ""}
          title={isLinkActive ? "Hapus Link" : "Tambah Link"}>
          {isLinkActive ? <UnlinkIcon className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
        </button>

        {/* Image + CTA */}
        <button type="button" onClick={insertFigure} title="Sisipkan Gambar + Keterangan">
          <ImageIcon className="w-4 h-4" />
        </button>
        <button type="button" onClick={insertCta} title="Sisipkan CTA Block">
          <LayoutTemplateIcon className="w-4 h-4" />
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

      {/* ── Table Contextual Controls ──────────────────────────────────────── */}
      {isInTable && (
        <div className="rich-text-table-controls">
          <span className="rich-text-table-controls-label">Kolom:</span>
          <button type="button" onClick={() => editor.chain().focus().addColumnBefore().run()} title="Tambah kolom sebelum">← Kolom</button>
          <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} title="Tambah kolom setelah">Kolom →</button>
          <button type="button" className="danger" onClick={() => editor.chain().focus().deleteColumn().run()} title="Hapus kolom">✕ Kolom</button>
          <div className="rich-text-table-controls-sep" />
          <span className="rich-text-table-controls-label">Baris:</span>
          <button type="button" onClick={() => editor.chain().focus().addRowBefore().run()} title="Tambah baris sebelum">↑ Baris</button>
          <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} title="Tambah baris setelah">Baris ↓</button>
          <button type="button" className="danger" onClick={() => editor.chain().focus().deleteRow().run()} title="Hapus baris">✕ Baris</button>
          <div className="rich-text-table-controls-sep" />
          <button type="button" className="danger" onClick={() => editor.chain().focus().deleteTable().run()} title="Hapus tabel">✕ Hapus Tabel</button>
        </div>
      )}

      {/* ── Link Dialog ────────────────────────────────────────────────────── */}
      {linkDialogOpen && (
        <div ref={linkDialogRef} className="rich-text-link-dialog">
          <div className="rich-text-link-dialog-label">URL Tautan</div>
          <URLAutocomplete
            value={linkUrl}
            onChange={setLinkUrl}
            placeholder="Pilih halaman atau ketik URL eksternal..."
          />
          <label className="rich-text-link-dialog-newtab">
            <input type="checkbox" checked={linkOpenInNewTab}
              onChange={(e) => setLinkOpenInNewTab(e.target.checked)} />
            <span>Buka di tab baru</span>
          </label>
          <div className="rich-text-link-dialog-actions">
            <button type="button" className="rich-text-link-btn-apply" onClick={applyLink}>Simpan</button>
            {isLinkActive && (
              <button type="button" className="rich-text-link-btn-remove" onClick={removeLink}>Hapus Link</button>
            )}
            <button type="button" className="rich-text-link-btn-cancel" onClick={() => setLinkDialogOpen(false)}>Batal</button>
          </div>
        </div>
      )}

      {/* ── Citation Dialog ─────────────────────────────────────────────────── */}
      {citationDialogOpen && (
        <div ref={citationDialogRef} className="rich-text-citation-dialog">
          <div className="rich-text-link-dialog-label">Sumber Kutipan</div>
          <input
            type="text"
            className="rich-text-citation-input"
            value={citationText}
            onChange={(e) => setCitationText(e.target.value)}
            placeholder="Nama penulis, judul buku, atau sumber lainnya..."
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCitation(); } }}
            autoFocus
          />
          <div className="rich-text-link-dialog-actions">
            <button type="button" className="rich-text-link-btn-apply" onClick={applyCitation}>Simpan</button>
            {editor.getAttributes("blockquote").citation && (
              <button type="button" className="rich-text-link-btn-remove" onClick={() => {
                editor.chain().focus().updateAttributes("blockquote", { citation: null }).run();
                setCitationDialogOpen(false);
              }}>Hapus Sumber</button>
            )}
            <button type="button" className="rich-text-link-btn-cancel" onClick={() => setCitationDialogOpen(false)}>Batal</button>
          </div>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <EditorContent editor={editor} style={{ minHeight, maxHeight }} />
    </div>
  );
}
