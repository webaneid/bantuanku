"use client";

import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";
import MediaLibrary from "../MediaLibrary";

// ── NodeView ────────────────────────────────────────────────────────────────

function FigureView({ node, updateAttributes, selected }: NodeViewProps) {
  const [mediaOpen, setMediaOpen] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const captionRef = useRef<HTMLElement>(null);

  // Auto-open MediaLibrary when freshly inserted (no src yet)
  useEffect(() => {
    if (!node.attrs.src) setMediaOpen(true);
  }, []);

  const handleCaptionBlur = () => {
    updateAttributes({ caption: captionRef.current?.textContent || "" });
    setEditingCaption(false);
  };

  return (
    <NodeViewWrapper as="figure" className={`rich-text-figure${selected ? " is-selected" : ""}`} data-drag-handle>
      {/* Change image button — only show when selected */}
      {selected && (
        <button
          type="button"
          contentEditable={false}
          className="rich-text-figure-edit-btn"
          onClick={() => setMediaOpen(true)}
          title="Ganti gambar"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>Ganti Gambar</span>
        </button>
      )}

      {node.attrs.src ? (
        <img src={node.attrs.src} alt={node.attrs.alt || ""} />
      ) : (
        <div className="rich-text-figure-placeholder" contentEditable={false}>
          Klik untuk pilih gambar...
        </div>
      )}

      <figcaption
        ref={captionRef as React.RefObject<HTMLElement>}
        contentEditable
        suppressContentEditableWarning
        className={editingCaption ? "is-editing" : ""}
        onClick={() => setEditingCaption(true)}
        onBlur={handleCaptionBlur}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") { e.preventDefault(); handleCaptionBlur(); }
        }}
        data-placeholder="Tulis keterangan gambar..."
      >
        {node.attrs.caption}
      </figcaption>

      {/* MediaLibrary popup */}
      <MediaLibrary
        isOpen={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={(url) => {
          updateAttributes({ src: url });
          setMediaOpen(false);
        }}
        selectedUrl={node.attrs.src}
        accept="image/*"
        category="general"
      />
    </NodeViewWrapper>
  );
}

// ── Extension ───────────────────────────────────────────────────────────────

export const FigureNode = Node.create({
  name: "figure",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
      caption: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs(dom) {
          const el = dom as HTMLElement;
          const img = el.querySelector("img");
          const caption = el.querySelector("figcaption");
          return {
            src: img?.getAttribute("src") || null,
            alt: img?.getAttribute("alt") || "",
            caption: caption?.textContent || "",
          };
        },
      },
      {
        // Backward-compat: parse plain <img> tags from old content
        tag: "img",
        getAttrs(dom) {
          const el = dom as HTMLElement;
          const alt = el.getAttribute("alt") || "";
          return {
            src: el.getAttribute("src") || null,
            alt,
            caption: alt, // show alt as caption for existing images
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { src, alt, caption } = node.attrs as {
      src: string | null;
      alt: string;
      caption: string;
    };
    const children: (string | Record<string, unknown> | (string | Record<string, unknown>)[])[] = [
      ["img", { src: src || "", alt: alt || "" }],
    ];
    if (caption) children.push(["figcaption", {}, caption]);
    return ["figure", {}, ...children];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureView);
  },
});
