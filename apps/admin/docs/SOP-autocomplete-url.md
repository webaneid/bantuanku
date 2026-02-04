# SOP: URL Autocomplete Component

## Overview
Standard Operating Procedure untuk penggunaan URL Autocomplete component di aplikasi admin Bantuanku. Component ini menyediakan autocomplete untuk memilih URL frontend dengan suggestions dari URL registry yang terpusat.

**✨ NEW**: Component sekarang support **URL eksternal** (https://...) dan **manual input** internal path (/...)!

## 1. File Locations

```
src/
├── components/
│   └── URLAutocomplete.tsx          # Main component
└── lib/
    └── url-registry.ts              # URL registry service
```

## 2. Component Interface

### Props

```typescript
interface URLAutocompleteProps {
  value: string;                      // Current URL value
  onChange: (value: string) => void;  // Callback when value changes
  placeholder?: string;               // Placeholder text
  className?: string;                 // Additional CSS class
  disabled?: boolean;                 // Disabled state (default: false)
}
```

### URL Option Interface

```typescript
interface URLOption {
  value: string;      // URL path (e.g., "/program/wakaf")
  label: string;      // Display label (e.g., "Pilar: Wakaf")
  category: 'Static' | 'Program' | 'Zakat' | 'Qurban' | 'Kategori' | 'Pilar';
  description?: string; // Optional description
}
```

## 3. Basic Usage

### Simple Implementation

```tsx
import URLAutocomplete from "@/components/URLAutocomplete";

const [ctaLink, setCtaLink] = useState("");

<URLAutocomplete
  value={ctaLink}
  onChange={setCtaLink}
  placeholder="Pilih URL atau ketik manual"
/>
```

### With Label and Helper Text

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Link Tombol
  </label>
  <URLAutocomplete
    value={slideForm.ctaLink}
    onChange={(value) => setSlideForm({ ...slideForm, ctaLink: value })}
    placeholder="Pilih URL atau ketik manual"
  />
  <p className="mt-1 text-xs text-gray-500">
    Pilih dari daftar URL yang tersedia atau ketik URL manual
  </p>
</div>
```

### With Form State

```tsx
const [formData, setFormData] = useState({
  title: "",
  link: "",
});

<URLAutocomplete
  value={formData.link}
  onChange={(value) => setFormData(prev => ({ ...prev, link: value }))}
  placeholder="Pilih URL tujuan"
/>
```

### Disabled State

```tsx
<URLAutocomplete
  value={link}
  onChange={setLink}
  placeholder="URL tidak dapat diubah"
  disabled={true}
/>
```

## 4. Manual URL Input (NEW!)

Component sekarang mendukung 3 mode input:

### A. Autocomplete (Default)
User memilih dari dropdown URL yang tersedia:
- Klik field → dropdown muncul
- Ketik untuk search/filter
- Klik URL untuk memilih

### B. Manual Internal Path
User bisa ketik internal path secara manual:
- Ketik path internal, contoh: `/custom-page`
- Tekan **Enter** atau click outside untuk save
- Path harus diawali dengan `/`

**Contoh:**
```
Input: /donasi-sekarang
Result: URL "/donasi-sekarang" tersimpan
```

### C. External URL
User bisa ketik full external URL:
- Ketik URL eksternal, contoh: `https://google.com`
- Component akan detect otomatis (harus dimulai dengan `http://` atau `https://`)
- Muncul indicator **hijau** jika URL valid
- Tekan **Enter** atau click outside untuk save

**Contoh:**
```
Input: https://wa.me/6281234567890
Result: External URL tersimpan dengan badge "Eksternal"
```

**Validasi:**
- ✅ Valid: `https://google.com`, `http://example.com/page`
- ❌ Invalid: `google.com`, `www.example.com` (harus ada protocol)

**Visual Indicators:**
- 🔗 Icon link biasa → Internal URL
- ↗️ Icon arrow → External URL
- 🏷️ Badge "Eksternal" → Menandakan link ke luar site

### Usage Example with All Modes

```tsx
// User bisa:
// 1. Pilih dari dropdown: "/program/wakaf"
// 2. Ketik manual internal: "/custom-page"
// 3. Ketik external: "https://example.com"

<URLAutocomplete
  value={menuItem.url}
  onChange={(value) => setMenuItem({ ...menuItem, url: value })}
  placeholder="Pilih URL, ketik /path, atau https://..."
/>
```

## 5. URL Registry

### Supported URL Types

URL Autocomplete secara otomatis fetch dan menampilkan URLs dari:

1. **Static Pages**
   - `/` - Beranda
   - `/program` - Semua Program
   - `/zakat` - Zakat
   - `/qurban` - Qurban

2. **Category Archives**
   - `/program/kategori/{slug}` - Program by category
   - Contoh: `/program/kategori/pendidikan`

3. **Pillar Archives**
   - `/program/pilar/{slug}` - Program by pillar
   - Contoh: `/program/pilar/wakaf`, `/program/pilar/zakat`

4. **Campaign Detail**
   - `/program/{slug}` - Individual campaign
   - Contoh: `/program/wakaf-bangungan-sd`

5. **Zakat Types**
   - `/zakat/{slug}` - Zakat type detail
   - Contoh: `/zakat/zakat-mal`, `/zakat/zakat-fitrah`

6. **Qurban Packages**
   - `/qurban/{slug}` - Qurban package detail
   - Contoh: `/qurban/kambing-reguler`

### Updating URL Registry

Edit `/apps/admin/src/lib/url-registry.ts` untuk menambah atau mengubah URL:

```typescript
// Add new static URL
const STATIC_URLS: URLOption[] = [
  // ... existing
  {
    value: '/tentang-kami',
    label: 'Tentang Kami',
    category: 'Static',
    description: 'Halaman tentang kami',
  },
];
```

## 5. Common Use Cases

### Hero Slider CTA Link

```tsx
// In Hero Slider form
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Link Tombol
  </label>
  <URLAutocomplete
    value={slideForm.ctaLink}
    onChange={(value) => setSlideForm({ ...slideForm, ctaLink: value })}
    placeholder="Pilih URL atau ketik manual"
  />
</div>
```

### Navigation Menu Items

```tsx
// In menu management
{menuItems.map((item, index) => (
  <div key={item.id}>
    <label>URL Menu</label>
    <URLAutocomplete
      value={item.url}
      onChange={(value) => handleMenuItemChange(index, 'url', value)}
      placeholder="Pilih halaman tujuan"
    />
  </div>
))}
```

### Call-to-Action Buttons

```tsx
// In content editor
<div className="cta-section">
  <label>Link CTA</label>
  <URLAutocomplete
    value={ctaUrl}
    onChange={setCtaUrl}
    placeholder="Kemana tombol ini mengarah?"
  />
</div>
```

### Banner Links

```tsx
// In banner management
<URLAutocomplete
  value={banner.link}
  onChange={(value) => updateBanner({ ...banner, link: value })}
  placeholder="URL tujuan banner"
/>
```

## 6. Features

### Searchable Dropdown
- Users dapat mengetik untuk mencari URL
- Filter real-time berdasarkan URL path, label, dan description
- Case-insensitive search

### Grouped by Category
URLs dikelompokkan berdasarkan kategori:
- Static (fixed pages)
- Program (campaign details)
- Kategori (category archives)
- Pilar (pillar archives)
- Zakat
- Qurban

### Smart Selection
- Menampilkan label yang user-friendly
- Menyimpan full URL path sebagai value
- Clear button untuk reset selection
- Manual input tetap diperbolehkan

### Keyboard Navigation
- `Escape` - Close dropdown
- `Enter` - Select jika hanya 1 hasil
- Click outside - Close dropdown

### Loading State
Menampilkan loading spinner saat fetch URLs dari API.

### Empty State
Menampilkan pesan friendly saat tidak ada hasil pencarian.

## 7. Styling

Component menggunakan Tailwind CSS classes yang sudah konsisten dengan design system:

```tsx
// Border states
border-gray-300         // Default
border-primary-500      // Focused/Open
ring-2 ring-primary-100 // Focus ring

// Background states
bg-white                // Default
bg-gray-50              // Disabled
hover:bg-gray-50        // Dropdown items hover
bg-primary-50           // Selected item

// Text states
text-gray-900           // Label text
text-gray-400           // Placeholder
text-gray-500           // Helper text
text-primary-700        // Selected item
```

## 8. Best Practices

### DO ✅

1. **Use for link/URL fields**
   ```tsx
   // Good - for URL selection
   <URLAutocomplete value={url} onChange={setUrl} />
   ```

2. **Provide helper text**
   ```tsx
   // Good - guide users
   <URLAutocomplete ... />
   <p className="text-xs text-gray-500">
     Pilih dari daftar atau ketik manual
   </p>
   ```

3. **Allow manual input**
   - Component supports typing URLs manually
   - Useful untuk external URLs atau new pages

4. **Use descriptive labels**
   ```tsx
   // Good - clear label
   <label>Link Tombol CTA</label>
   <URLAutocomplete ... />
   ```

### DON'T ❌

1. **Don't use for non-URL fields**
   ```tsx
   // Bad - use regular Autocomplete instead
   <URLAutocomplete value={category} ... />
   ```

2. **Don't disable without reason**
   ```tsx
   // Bad - confusing for users
   <URLAutocomplete disabled={true} />
   ```

3. **Don't remove placeholder**
   ```tsx
   // Bad - no guidance
   <URLAutocomplete value={url} onChange={setUrl} />

   // Good - with placeholder
   <URLAutocomplete
     value={url}
     onChange={setUrl}
     placeholder="Pilih URL tujuan"
   />
   ```

## 9. Troubleshooting

### URLs tidak muncul

**Problem:** Dropdown kosong atau loading terus

**Solution:**
1. Check API endpoint accessibility
2. Check console untuk error messages
3. Verify `NEXT_PUBLIC_API_URL` environment variable

### URL tidak ter-select

**Problem:** Click pada item tidak meng-update value

**Solution:**
1. Pastikan `onChange` handler ter-implement dengan benar
2. Check state management (useState, form state)

### Search tidak bekerja

**Problem:** Typing tidak filter results

**Solution:**
- Component search by default, pastikan tidak ada custom filter yang conflict

### External URLs

**Problem:** Perlu input external URL (https://example.com)

**Solution:**
- Component supports manual input
- Simply type full URL including protocol
- Atau tambah ke URL registry jika sering dipakai

## 10. Migration Guide

### Dari Manual Input

Before:
```tsx
<input
  type="text"
  value={ctaLink}
  onChange={(e) => setCtaLink(e.target.value)}
  placeholder="/program/bantuan-pendidikan"
/>
```

After:
```tsx
<URLAutocomplete
  value={ctaLink}
  onChange={setCtaLink}
  placeholder="Pilih URL atau ketik manual"
/>
```

### Dari Select Dropdown

Before:
```tsx
<select value={pageUrl} onChange={(e) => setPageUrl(e.target.value)}>
  <option value="/">Beranda</option>
  <option value="/program">Program</option>
  <option value="/zakat">Zakat</option>
</select>
```

After:
```tsx
<URLAutocomplete
  value={pageUrl}
  onChange={setPageUrl}
  placeholder="Pilih halaman"
/>
```

## 11. Performance

### Caching
- URLs di-fetch sekali on component mount
- Stored in component state untuk re-use
- No re-fetch on dropdown open/close

### Lazy Loading
- Component only fetches when mounted
- Dropdown content rendered only when open

### Optimization Tips
1. Component sudah optimized, no additional action needed
2. URL registry fetch di-handle secara async
3. Search filter uses memoization internally

## 12. Integration Examples

### With React Hook Form

```tsx
import { useForm, Controller } from "react-hook-form";
import URLAutocomplete from "@/components/URLAutocomplete";

const { control, handleSubmit } = useForm();

<Controller
  name="ctaLink"
  control={control}
  render={({ field }) => (
    <URLAutocomplete
      value={field.value}
      onChange={field.onChange}
      placeholder="Pilih URL"
    />
  )}
/>
```

### With Formik

```tsx
import { useFormik } from "formik";
import URLAutocomplete from "@/components/URLAutocomplete";

const formik = useFormik({
  initialValues: { link: "" },
  onSubmit: (values) => console.log(values),
});

<URLAutocomplete
  value={formik.values.link}
  onChange={(value) => formik.setFieldValue('link', value)}
  placeholder="Pilih URL"
/>
```

### With Custom Validation

```tsx
const [link, setLink] = useState("");
const [error, setError] = useState("");

const handleLinkChange = (value: string) => {
  setLink(value);

  // Validate
  if (value && !value.startsWith('/')) {
    setError('Internal URLs harus dimulai dengan /');
  } else {
    setError('');
  }
};

<URLAutocomplete
  value={link}
  onChange={handleLinkChange}
  placeholder="Pilih URL"
/>
{error && <p className="text-red-500 text-xs mt-1">{error}</p>}
```

## 13. Future Enhancements

Potential improvements untuk future versions:

1. **URL Preview**
   - Show thumbnail/preview saat hover
   - Display page meta description

2. **Recent URLs**
   - Track recently used URLs
   - Show as quick access

3. **Favorites**
   - Allow marking favorite URLs
   - Quick access to commonly used pages

4. **External URL Support**
   - Better handling for external links
   - Validation untuk external URLs

5. **Analytics Integration**
   - Track which URLs are most selected
   - Usage statistics

## 14. Support

For questions or issues:
1. Check this SOP documentation
2. Review component source code
3. Check URL registry configuration
4. Contact development team

---

**Last Updated:** 2026-02-02
**Version:** 1.0.0
**Maintainer:** Development Team
