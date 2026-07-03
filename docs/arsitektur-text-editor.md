# Arsitektur Text Editor

Dokumen ini adalah source of truth untuk sistem rich text editor di Bantuanku. Editor dipakai di admin untuk membuat konten campaign, halaman statis, laporan kegiatan, jenis zakat, dan paket qurban. Output HTML-nya di-render di web publik menggunakan Tailwind Typography (`prose`).

---

## Ruang Lingkup

| Area | File |
|------|------|
| Komponen editor (admin) | `apps/admin/src/components/RichTextEditor.tsx` |
| Style editor (admin) | `apps/admin/src/styles/components/_rich-text-editor.scss` |
| Rendering web publik | `className="prose ..."` + `dangerouslySetInnerHTML` |
| Style render web | Tailwind Typography plugin (`prose`) + custom override |
| Library utama | `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder` |

---

## State Saat Ini (Update 2026-07-03)

### Implementasi Per Fase

| Fase | Status | Selesai |
|------|--------|---------|
| Fase 1 — H2/H3/H4, Strikethrough, Link+URLAutocomplete | ✅ Selesai | 2026-07-03 |
| Fase 2 — Table + BlockquoteWithCitation | ✅ Selesai | 2026-07-03 |
| Fase 3 — Image+Caption (FigureNode) + CTA Block | ✅ Selesai | 2026-07-03 |

### Fitur Aktif (Fase 1 + 2)

| Fitur | Status | Keterangan |
|-------|--------|------------|
| Bold / Italic | ✅ Ada | Toolbar + StarterKit |
| Strikethrough | ✅ Ada | Toolbar + StarterKit |
| Bullet List | ✅ Ada | Toolbar + StarterKit |
| Ordered List | ✅ Ada | Toolbar + StarterKit |
| Heading H2 / H3 / H4 | ✅ Ada | Toolbar expose H2, H3, H4 |
| Blockquote | ✅ Ada | Via `BlockquoteWithCitation` custom extension |
| Blockquote Citation | ✅ Ada | Tombol `— cite` muncul saat kursor di blockquote; output `data-citation` attr |
| Table | ✅ Ada | Insert 3×3 dengan header row, contextual controls row |
| Table controls | ✅ Ada | Tambah/hapus kolom & baris, hapus tabel |
| Link + URLAutocomplete | ✅ Ada | Dialog dengan URLAutocomplete + checkbox "buka di tab baru" |
| Undo / Redo | ✅ Ada | Toolbar + StarterKit History |
| Paragraph | ✅ Ada | Default |
| CSS editor (admin) | ✅ Ada | `_rich-text-editor.scss` — cover semua blok termasuk table dan citation |
| CSS render web | ✅ Ada | Tailwind `prose` class (citation via `[data-citation]::after` belum di web) |

### Fitur Tambahan Fase 3

| Fitur | Status | Keterangan |
|-------|--------|------------|
| Image dengan caption (FigureNode) | ✅ Ada | `apps/admin/src/components/editor/FigureNode.tsx` |
| CTA Block | ✅ Ada | `apps/admin/src/components/editor/CtaBlock.tsx` |
| CTA hydration di web | ✅ Ada | `apps/web/src/lib/render-content.tsx` + `html-react-parser` |
| CSS citation di web | ✅ Ada | `globals.scss` — `.prose blockquote[data-citation]::after` |

### Pemakai `RichTextEditor` Saat Ini

| Halaman | Field | Keterangan |
|---------|-------|------------|
| `CampaignForm.tsx` | `content` | Deskripsi lengkap campaign |
| `ZakatTypeForm.tsx` | `content` | Deskripsi jenis zakat |
| `PageForm.tsx` | `content` | Isi halaman statis CMS |
| `activity-reports/create/page.tsx` | `description` | Isi laporan kegiatan |
| `activity-reports/[id]/edit/page.tsx` | `description` | Edit laporan kegiatan |

### Library Terpasang di `apps/admin`

```json
"@tiptap/extension-link": "^3.15.3",
"@tiptap/extension-placeholder": "^3.15.3",
"@tiptap/extension-table": "^3.15.3",
"@tiptap/extension-table-cell": "^3.15.3",
"@tiptap/extension-table-header": "^3.15.3",
"@tiptap/extension-table-row": "^3.15.3",
"@tiptap/react": "^3.15.3",
"@tiptap/starter-kit": "^3.15.3"
```

> `@tiptap/extension-blockquote` tersedia sebagai hoisted dependency dari StarterKit — tidak perlu install terpisah.

### Library apps/web (ditambahkan Fase 3)

```json
"html-react-parser": "^6.1.3"
```

> `@tiptap/extension-image` tidak diperlukan — `FigureNode` adalah custom extension yang handle segalanya sendiri.

---

## Target Arsitektur

### Prinsip

1. **Komponen tunggal** — `RichTextEditor` di `apps/admin/src/components/` dipakai di semua form yang butuh rich text.
2. **Output HTML** — editor menyimpan dan mengembalikan HTML string. Tidak ada JSON atau format proprietary.
3. **Render web pakai `prose`** — semua halaman web yang render konten editor memakai `className="prose"` dan `dangerouslySetInnerHTML`. Custom blok (CTA, image+caption) butuh override CSS di web.
4. **MediaLibrary terintegrasi** — tombol insert gambar membuka `MediaLibrary` popup (category `general`). Mitra hanya akses category yang diperbolehkan.
5. **URLAutocomplete** — dialog link memanfaatkan `URLAutocomplete` yang sudah ada di admin.

---

## Fitur Target & Extension Map

### Fitur Native Tiptap (StarterKit)

| Fitur | Extension | Output HTML |
|-------|-----------|-------------|
| Paragraf | `Paragraph` | `<p>` |
| Bold | `Bold` | `<strong>` |
| Italic | `Italic` | `<em>` |
| Strikethrough | `Strike` | `<s>` |
| Bullet list | `BulletList` + `ListItem` | `<ul><li>` |
| Ordered list | `OrderedList` + `ListItem` | `<ol><li>` |
| Heading H2 | `Heading` level 2 | `<h2>` |
| Heading H3 | `Heading` level 3 | `<h3>` |
| Heading H4 | `Heading` level 4 | `<h4>` |
| Horizontal rule | `HorizontalRule` | `<hr>` |
| Undo / Redo | `History` | — |

> **Catatan H1**: H1 tidak diekspos di toolbar. H1 dipakai khusus judul halaman (SEO). Editor hanya menyediakan H2–H4.

### Fitur dari Extension Tambahan

| Fitur | Extension | Output HTML |
|-------|-----------|-------------|
| Link / URL | `@tiptap/extension-link` | `<a href="...">` |
| Table | `@tiptap/extension-table` + Row/Cell/Header | `<table>` |
| Image (dasar) | `@tiptap/extension-image` | `<img>` |

### Fitur via Custom Extension / Node

| Fitur | Nama Custom | Output HTML |
|-------|-------------|-------------|
| Blockquote + Citation | `BlockquoteWithCitation` | `<blockquote><p>isi</p><cite>sumber</cite></blockquote>` |
| Image + Caption | `FigureNode` | `<figure><img /><figcaption>caption</figcaption></figure>` |
| CTA Block | `CtaBlock` | `<div data-type="cta-block">...</div>` |
| Tombol link | Inline dalam CTA atau Link extension | `<a class="btn-cta">` |

---

## Desain Custom Extensions

### 1. BlockquoteWithCitation ✅ Diimplementasikan

Extend `Blockquote` dari `@tiptap/extension-blockquote` dengan attribute `citation`:

```ts
const BlockquoteWithCitation = Blockquote.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      citation: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-citation") || null,
        renderHTML: (attrs) => attrs.citation ? { "data-citation": attrs.citation } : {},
      },
    };
  },
});
```

- Citation disimpan sebagai `data-citation` HTML attribute (bukan `<cite>` child node)
- Di admin SCSS: `blockquote[data-citation]::after { content: '— ' attr(data-citation); ... }`
- Di web: perlu ditambahkan override `prose blockquote[data-citation]::after` (belum done)
- Output HTML:
  ```html
  <blockquote data-citation="Yusuf Qardhawi">
    <p>Zakat bukan sekadar kewajiban, melainkan hak fakir miskin atas harta kita.</p>
  </blockquote>
  ```

### 2. FigureNode (Image + Caption)

`@tiptap/extension-image` hanya render `<img>` tanpa container atau caption. Custom node:

- Node group: `block`
- Atom: false (bisa fokus, tapi konten caption tetap editabel)
- Komponen React untuk editor: tampilkan gambar + textarea caption di bawahnya
- Sumber gambar: MediaLibrary popup (category `general`)
- Output HTML:
  ```html
  <figure>
    <img src="https://..." alt="Deskripsi gambar" />
    <figcaption>Penyerahan donasi kepada penerima manfaat di Bogor, Januari 2026.</figcaption>
  </figure>
  ```

### 3. CtaBlock

Block khusus untuk call-to-action di tengah artikel:

- Node type: `atom` (seluruh block dipilih sekaligus)
- Field (disimpan sebagai attrs): `title`, `description`, `buttonText`, `buttonUrl`
- Dialog/form untuk edit fields
- Output HTML:
  ```html
  <div data-type="cta-block"
       data-title="Dukung Program Ini"
       data-description="Setiap donasi Anda membantu kami menjangkau lebih banyak penerima manfaat."
       data-button-text="Donasi Sekarang"
       data-button-url="/program/slug-program">
  </div>
  ```
- Web frontend meng-hydrate `data-type="cta-block"` menjadi komponen visual. Lihat **Frontend CSS & Rendering**.

---

## Toolbar Layout

Toolbar dibagi per grup dengan divider:

```
[ B ] [ I ] [ S ] | [ H2 ] [ H3 ] [ H4 ] | [ — Liste • ] [ — Liste 1. ] | [ " ] [ ⊞ ] | [ 🖼 ] [ 🔗 ] [ CTA ] | [ ↩ ] [ ↪ ]
```

| Grup | Tombol |
|------|--------|
| Inline | Bold, Italic, Strikethrough |
| Heading | H2, H3, H4 |
| List | Bullet, Ordered |
| Block | Blockquote+Citation, Table |
| Media & Link | Insert Image, Insert Link, Insert CTA |
| History | Undo, Redo |

Tombol **aktif** (`.is-active`) diberi background `primary-100` dan warna `primary-700` — sudah ada di SCSS.

---

## Format Output

- Format: **HTML string**
- Disimpan di kolom DB: `content TEXT` (campaigns, zakat_types, qurban_packages, pages, activity_reports)
- Dikembalikan API: field `content` atau `description` di response
- Dirender web: `dangerouslySetInnerHTML={{ __html: content }}`

Tidak ada migrasi format diperlukan selama editor tetap output HTML.

---

## Frontend CSS & Rendering

### Tailwind `prose` (sudah ada)

Semua halaman web yang render konten editor memakai:

```tsx
<div
  className="prose prose-sm md:prose-base max-w-none text-gray-700 prose-headings:text-gray-900 prose-img:rounded-lg"
  dangerouslySetInnerHTML={{ __html: content }}
/>
```

Tailwind `prose` sudah menangani: `p`, `h2–h4`, `strong`, `em`, `ul/ol/li`, `a`, `img`, `table`, `blockquote`, `hr`, `figure/figcaption`.

### Custom Blok yang Perlu Override CSS

Blok-blok berikut **tidak dirender baik oleh `prose` biasa** dan memerlukan CSS tambahan di web:

#### blockquote + cite

```css
/* apps/web/src/styles/ atau tailwind plugin */
.prose blockquote cite {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  font-style: normal;
  font-weight: 500;
  color: #6b7280;  /* gray-500 */
}
.prose blockquote cite::before {
  content: "— ";
}
```

Design: blockquote diberi border-left hijau/primary, background tint ringan, cite italic di bawah.

#### figure + figcaption

```css
.prose figure {
  margin: 2rem 0;
}
.prose figure img {
  width: 100%;
  border-radius: 0.5rem;
}
.prose figure figcaption {
  text-align: center;
  font-size: 0.8125rem;
  color: #9ca3af; /* gray-400 */
  margin-top: 0.5rem;
  font-style: italic;
}
```

#### CTA Block

`data-type="cta-block"` harus di-render oleh komponen React di web, **bukan** dibiarkan sebagai raw HTML. Alasannya: tombol harus bisa diklik, styling perlu tailwind, dan `buttonUrl` bisa route internal.

Pendekatan rendering CTA di web:

```tsx
// libs/render-content.tsx
import parse, { domToReact, Element } from "html-react-parser";

export function RenderContent({ html }: { html: string }) {
  return parse(html, {
    replace(domNode) {
      if (domNode instanceof Element && domNode.attribs["data-type"] === "cta-block") {
        const { "data-title": title, "data-description": desc,
                "data-button-text": btnText, "data-button-url": btnUrl } = domNode.attribs;
        return <CtaBlockDisplay title={title} description={desc} buttonText={btnText} buttonUrl={btnUrl} />;
      }
    }
  });
}
```

`CtaBlockDisplay` adalah komponen UI menarik (card dengan gradient, tombol rounded berwarna primary):

```
┌─────────────────────────────────────────┐
│  🎯 Dukung Program Ini                  │
│  Setiap donasi Anda membantu kami...    │
│                  [ Donasi Sekarang →  ] │
└─────────────────────────────────────────┘
```

Library `html-react-parser` perlu ditambahkan di `apps/web` jika tidak ada. Alternatif: DOMParser + React.createElement secara manual.

---

## Admin Editor SCSS (Target)

Extend `_rich-text-editor.scss` untuk:

```scss
// Table
.rich-text-editor-content {
  table {
    border-collapse: collapse;
    width: 100%;
    margin: $spacing-lg 0;

    th, td {
      border: 1px solid $gray-300;
      padding: $spacing-sm $spacing-md;
      text-align: left;
    }

    th {
      background: $gray-100;
      font-weight: 600;
      font-size: 0.875rem;
    }

    tr:nth-child(even) td {
      background: $gray-50;
    }
  }

  // Image + figcaption
  figure {
    margin: $spacing-lg 0;

    img {
      width: 100%;
      border-radius: $radius-md;
    }

    figcaption {
      text-align: center;
      font-size: 0.8125rem;
      color: $gray-500;
      margin-top: $spacing-xs;
      font-style: italic;
    }
  }

  // Blockquote dengan cite
  blockquote {
    border-left: 4px solid $primary-400;
    background: $primary-50;
    border-radius: 0 $radius-md $radius-md 0;
    padding: $spacing-md $spacing-md $spacing-md $spacing-lg;
    margin: $spacing-lg 0;
    color: $gray-700;
    font-style: italic;

    cite {
      display: block;
      margin-top: $spacing-xs;
      font-size: 0.875rem;
      font-style: normal;
      font-weight: 500;
      color: $gray-500;
    }
  }

  // CTA Block preview di editor
  [data-type="cta-block"] {
    border: 2px dashed $primary-300;
    background: $primary-50;
    border-radius: $radius-md;
    padding: $spacing-md;
    margin: $spacing-lg 0;
    text-align: center;
    cursor: pointer;

    &::before {
      content: "CTA Block";
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: $primary-500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: $spacing-xs;
    }
  }

  // Link
  a {
    color: $primary-600;
    text-decoration: underline;

    &:hover {
      color: $primary-700;
    }
  }
}
```

---

## Props Komponen

```tsx
interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;      // default: 200px
  maxHeight?: number;      // default: 500px
}
```

Tidak ada perubahan breaking pada props existing. Semua pemakai yang ada kompatibel.

---

## Dependensi & Instalasi

```bash
# Di apps/admin
npm install --workspace=apps/admin \
  @tiptap/extension-image \
  @tiptap/extension-link \
  @tiptap/extension-table \
  @tiptap/extension-table-row \
  @tiptap/extension-table-cell \
  @tiptap/extension-table-header

# Di apps/web (jika pakai html-react-parser untuk CTA)
npm install --workspace=apps/web html-react-parser
```

---

## Gap Implementasi

Semua fase selesai. Tidak ada gap yang tersisa. Zakat detail page (`/zakat/[slug]`) tidak render HTML editor — `description` field ditampilkan sebagai plain text, bukan HTML.

---

## Urutan Implementasi

**Fase 1 — ✅ SELESAI (2026-07-03): Toolbar Heading & Link**
- H2/H3/H4 tombol di toolbar (Heading2Icon, Heading3Icon, Heading4Icon dari lucide)
- Strikethrough toolbar
- `@tiptap/extension-link` + dialog link pakai `URLAutocomplete`
- Dialog link: URLAutocomplete + checkbox "Buka di tab baru"
- SCSS: H4 style, strikethrough, link hover, link dialog styles

**Fase 2 — ✅ SELESAI (2026-07-03): Table & Blockquote Citation**
- `@tiptap/extension-table` + TableRow/TableCell/TableHeader
- Insert table 3×3 dengan header row
- Contextual toolbar row saat kursor di dalam table (add/delete col/row, delete table)
- `BlockquoteWithCitation` = `Blockquote.extend({ addAttributes: { citation } })`
- Citation disimpan sebagai `data-citation` HTML attr; ditampilkan via CSS `::after`
- Tombol `— cite` muncul di toolbar hanya saat kursor di blockquote
- Dialog citation: input text + Simpan/Hapus Sumber/Batal
- SCSS: table (th/td), citation `::after`, table controls row dengan warning color

**Fase 3 — ✅ SELESAI (2026-07-03): Image + Caption & CTA**
- `FigureNode` custom extension (`apps/admin/src/components/editor/FigureNode.tsx`)
  - `atom: true`, ReactNodeViewRenderer, click "Sisipkan Gambar" → MediaLibrary popup terbuka otomatis
  - Figcaption editable inline via `contentEditable + onBlur → updateAttributes`
  - "Ganti Gambar" button muncul saat node selected
  - Output: `<figure><img src alt><figcaption>caption</figcaption></figure>`
- `CtaBlock` custom extension (`apps/admin/src/components/editor/CtaBlock.tsx`)
  - `atom: true`, ReactNodeViewRenderer, form dialog terbuka otomatis saat baru insert
  - Fields: title, description, buttonText, buttonUrl (pakai URLAutocomplete)
  - Preview card di editor; output: `<div data-type="cta-block" data-title data-description data-button-text data-button-url>`
- `RenderContent` di web (`apps/web/src/lib/render-content.tsx`)
  - Pakai `html-react-parser` untuk hydrate `data-type="cta-block"` → React component
  - `CtaBlockDisplay`: gradient card + Link (internal) / `<a>` (eksternal)
  - Dipakai di: CampaignTabs, QurbanTabs, LaporanDetailClient, DocumentationView, `page/[slug]/page.tsx`
- CSS citation di web: `globals.scss` — `.prose blockquote[data-citation]::after`

---

## Pemakai dan Render Web

| Halaman Web | Komponen | Cara Render |
|-------------|----------|-------------|
| `/program/[slug]` | `CampaignTabs` | `prose prose-sm md:prose-base max-w-none` |
| `/zakat/[slug]` | page | `prose prose-sm md:prose-base max-w-none` |
| `/qurban/[id]` | `QurbanTabs` | `prose prose-sm max-w-none` |
| `/page/[slug]` | page | `prose prose-sm md:prose-base max-w-none` |
| `/laporan/[slug]` | `LaporanDetailClient` | `prose prose-sm md:prose-base max-w-none prose-img:rounded-lg` |
| `/dokumentasi` | `DocumentationView` | `prose prose-sm md:prose-base max-w-none` |
| Activity report embed di laporan qurban/zakat | inline | `prose prose-gray max-w-none` |

**Rekomendasi standarisasi**: semua halaman web yang render konten editor sebaiknya memakai class yang konsisten:

```tsx
className="prose prose-sm md:prose-base max-w-none text-gray-700 prose-headings:text-gray-900 prose-img:rounded-lg prose-a:text-primary-600"
```

---

## Keputusan Arsitektur

1. Output format tetap **HTML**, bukan JSON Tiptap. Kompatibel dengan data yang sudah ada.
2. H1 **tidak** diekspos di toolbar — reserved untuk judul halaman (SEO, hanya satu H1 per halaman).
3. `RichTextEditor` tetap satu komponen — bukan per-konteks. Fitur aktif/nonaktif dikontrol lewat props jika diperlukan di masa depan.
4. Image selalu melalui **MediaLibrary popup** (category `general`). Tidak ada drag-and-drop atau paste upload di editor.
5. CTA Block di web **wajib di-hydrate** via `html-react-parser` atau custom render — tidak boleh dibiarkan sebagai raw `data-*` attribute di prose.
6. URLAutocomplete di dialog link memanfaatkan komponen yang sudah ada di `apps/admin/src/components/URLAutocomplete.tsx`.
