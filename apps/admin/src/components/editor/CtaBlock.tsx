"use client";

import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState, useEffect } from "react";
import { Pencil, Trash2, ExternalLink } from "lucide-react";

// ── NodeView ────────────────────────────────────────────────────────────────

interface CtaForm {
  title: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
}

function CtaBlockView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const attrs = node.attrs as CtaForm;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CtaForm>({
    title: attrs.title || "",
    description: attrs.description || "",
    buttonText: attrs.buttonText || "",
    buttonUrl: attrs.buttonUrl || "",
  });

  // Auto-open edit dialog when freshly inserted (empty title)
  useEffect(() => {
    if (!attrs.title) setEditing(true);
  }, []);

  const openEdit = () => {
    setForm({
      title: attrs.title || "",
      description: attrs.description || "",
      buttonText: attrs.buttonText || "",
      buttonUrl: attrs.buttonUrl || "",
    });
    setEditing(true);
  };

  const save = () => {
    updateAttributes(form);
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  return (
    <NodeViewWrapper contentEditable={false}>
      <div className={`rich-text-cta-block${selected ? " is-selected" : ""}`}>
        {/* Header bar */}
        <div className="rich-text-cta-block-header">
          <span className="rich-text-cta-block-label">CTA Block</span>
          <div className="rich-text-cta-block-actions">
            <button type="button" onClick={openEdit} title="Edit CTA">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => deleteNode()} title="Hapus CTA" className="danger">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="rich-text-cta-block-preview">
          {attrs.title ? (
            <>
              <div className="rich-text-cta-block-title">{attrs.title}</div>
              {attrs.description && (
                <div className="rich-text-cta-block-desc">{attrs.description}</div>
              )}
              {attrs.buttonText && (
                <div className="rich-text-cta-block-btn">
                  {attrs.buttonText}
                  {attrs.buttonUrl && <ExternalLink className="w-3 h-3 inline ml-1" />}
                </div>
              )}
            </>
          ) : (
            <div className="rich-text-cta-block-empty">Klik ikon pensil untuk konfigurasi CTA...</div>
          )}
        </div>

        {/* Edit form */}
        {editing && (
          <div className="rich-text-cta-form">
            <label className="rich-text-cta-form-label">Judul</label>
            <input
              type="text"
              className="rich-text-cta-form-input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Dukung Program Ini"
              autoFocus
            />

            <label className="rich-text-cta-form-label">Deskripsi <span>(opsional)</span></label>
            <textarea
              className="rich-text-cta-form-textarea"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Setiap donasi Anda membantu kami menjangkau lebih banyak penerima manfaat."
            />

            <label className="rich-text-cta-form-label">Teks Tombol</label>
            <input
              type="text"
              className="rich-text-cta-form-input"
              value={form.buttonText}
              onChange={(e) => setForm((f) => ({ ...f, buttonText: e.target.value }))}
              placeholder="Donasi Sekarang"
            />

            <label className="rich-text-cta-form-label">URL Tombol <span>(contoh: /program/slug atau https://...)</span></label>
            <input
              type="text"
              className="rich-text-cta-form-input"
              value={form.buttonUrl}
              onChange={(e) => setForm((f) => ({ ...f, buttonUrl: e.target.value }))}
              placeholder="/program/nama-program atau https://..."
            />

            <div className="rich-text-cta-form-actions">
              <button type="button" className="rich-text-link-btn-apply" onClick={save}>
                Simpan
              </button>
              <button type="button" className="rich-text-link-btn-cancel" onClick={cancel}>
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// ── Extension ───────────────────────────────────────────────────────────────

export const CtaBlock = Node.create({
  name: "ctaBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: "" },
      description: { default: "" },
      buttonText: { default: "" },
      buttonUrl: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="cta-block"]',
        getAttrs(dom) {
          const el = dom as HTMLElement;
          return {
            title: el.getAttribute("data-title") || "",
            description: el.getAttribute("data-description") || "",
            buttonText: el.getAttribute("data-button-text") || "",
            buttonUrl: el.getAttribute("data-button-url") || "",
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { title, description, buttonText, buttonUrl } = node.attrs as CtaForm;
    return [
      "div",
      {
        "data-type": "cta-block",
        "data-title": title,
        "data-description": description,
        "data-button-text": buttonText,
        "data-button-url": buttonUrl,
      },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CtaBlockView);
  },
});
