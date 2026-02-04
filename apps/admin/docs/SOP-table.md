# SOP: Standard Table Component

## Overview
Standard Operating Procedure untuk pembuatan table component yang konsisten, responsive, dan reusable di seluruh aplikasi admin Bantuanku.

## 1. File Structure

```
src/
├── styles/
│   └── components/
│       ├── _table.scss           # Desktop table styles
│       └── _table-mobile.scss    # Mobile/tablet card styles
└── app/
    └── dashboard/
        └── [feature]/
            └── page.tsx          # Feature page dengan table
```

## 2. SCSS Class Structure

### Desktop Table Classes

#### Container
```scss
.table-container
```
- Background: white
- Border radius: `$radius-xl`
- Box shadow: `$shadow-sm`
- Border: 1px solid `$gray-200`
- Overflow-x: auto (horizontal scroll jika perlu)

#### Table
```scss
.table
```
- Width: 100%
- Min-width: 1000px (untuk scroll horizontal)
- Border-collapse: separate
- Border-spacing: 0

#### Table Header
```scss
.table thead
.table thead th
.table thead th.sortable
```
- Background: `$gray-50`
- Padding: `$spacing-lg $spacing-xl`
- Font-size: 0.875rem
- Font-weight: 500
- Color: `$gray-600`
- Sortable: cursor pointer + arrow indicator

#### Table Body
```scss
.table tbody
.table tbody tr
.table tbody td
```
- Background: white
- Border-bottom: 1px solid `$gray-100`
- Hover: background `$gray-50`
- Padding: `$spacing-lg $spacing-xl`

#### Special Cell Types
```scss
td.mono           # Monospace font untuk angka
.table-icon       # Icon circle untuk avatar/initial
.table-actions    # Container untuk action buttons
```

### Mobile Card Classes (≤ 1024px)

```scss
.table-mobile-cards
.table-card
.table-card-header
.table-card-header-left
.table-card-header-title
.table-card-header-subtitle
.table-card-header-badge
.table-card-row
.table-card-row-label
.table-card-row-value
.table-card-progress
.table-card-progress-bar
.table-card-progress-bar-fill
.table-card-progress-text
.table-card-footer
```

## 3. HTML Structure Template

### Desktop Table

```tsx
<div className="table-container">
  <table className="table">
    <thead>
      <tr>
        <th className="sortable">Column 1</th>
        <th className="sortable">Column 2</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      {data?.map((item) => (
        <tr key={item.id}>
          <td>
            <div className="font-medium text-gray-900">{item.title}</div>
            <div className="text-sm text-gray-500">{item.subtitle}</div>
          </td>
          <td className="mono text-sm">Rp {formatRupiah(item.amount)}</td>
          <td>
            <div className="table-actions">
              <button className="action-btn action-view">
                <EyeIcon />
              </button>
              <button className="action-btn action-edit">
                <PencilIcon />
              </button>
              <button className="action-btn action-delete">
                <TrashIcon />
              </button>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### Mobile Cards

```tsx
<div className="table-mobile-cards">
  {data?.map((item) => (
    <div key={item.id} className="table-card">
      <div className="table-card-header">
        <div className="table-card-header-left">
          <div className="table-card-header-title">{item.title}</div>
          <div className="table-card-header-subtitle">{item.subtitle}</div>
        </div>
        <span className="table-card-header-badge bg-success-50 text-success-700">
          {item.status}
        </span>
      </div>

      <div className="table-card-row">
        <span className="table-card-row-label">Label</span>
        <span className="table-card-row-value mono">Value</span>
      </div>

      {/* Progress bar (optional) */}
      <div className="table-card-progress">
        <div className="table-card-progress-bar">
          <div
            className="table-card-progress-bar-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="table-card-progress-text">{progress}%</div>
      </div>

      <div className="table-card-footer">
        <button className="action-btn action-view">
          <EyeIcon />
        </button>
        <button className="action-btn action-edit">
          <PencilIcon />
        </button>
        <button className="action-btn action-delete">
          <TrashIcon />
        </button>
      </div>
    </div>
  ))}
</div>
```

## 4. Action Button Classes

### Class Names
```scss
.action-btn              # Base button style
.action-btn.action-view  # View button (blue hover)
.action-btn.action-edit  # Edit button (yellow hover)
.action-btn.action-delete # Delete button (red hover)
```

### Colors
- **View**: Primary (blue) - `$primary-50`, `$primary-600`, `$primary-200`
- **Edit**: Warning (yellow) - `$warning-50`, `$warning-600`, `$warning-200`
- **Delete**: Danger (red) - `$danger-50`, `$danger-600`, `$danger-200`

### Size
- Width: 32px (desktop), 36px (mobile)
- Height: 32px (desktop), 36px (mobile)
- Icon: 16px (desktop), 18px (mobile)

## 5. Responsive Breakpoints

```scss
// Desktop: Table view
@media (min-width: 1025px) {
  .table-mobile-cards { display: none; }
}

// Mobile/Tablet: Card view
@media (max-width: 1024px) {
  .table { display: none; }
  .table-mobile-cards { display: block; }
}
```

## 6. Typography

### Font Families
- **Default**: System font stack
- **Numbers/Currency**: Monospace (`'SF Mono', 'Monaco', 'Consolas', monospace`)

### Font Sizes
- Table header: 0.875rem (14px)
- Table body: 0.875rem (14px)
- Small text: 0.75rem (12px)
- Card title: 0.9375rem (15px)
- Card subtitle: 0.8125rem (13px)

### Font Weights
- Header: 500 (medium)
- Title: 600 (semibold)
- Regular: 400 (normal)

## 7. Color Variables

### Status Badges
```scss
// Active/Success
.bg-success-50.text-success-700

// Draft/Inactive
.bg-gray-100.text-gray-700

// Completed/Info
.bg-primary-50.text-primary-700

// Cancelled/Error
.bg-danger-50.text-danger-700
```

### Currency/Numbers
```scss
.mono                    # Monospace font
.text-sm                # Small text size
```

## 8. Spacing Standards

```scss
$spacing-xs: 0.25rem    // 4px
$spacing-sm: 0.5rem     // 8px
$spacing-md: 1rem       // 16px
$spacing-lg: 1.5rem     // 24px
$spacing-xl: 2rem       // 32px
```

## 9. Common Patterns

### Currency Display
```tsx
<td className="mono text-sm">
  Rp {formatRupiah(amount)}
</td>
```

### Date Display
```tsx
<td className="text-gray-600 text-sm">
  {format(new Date(date), "EEEE, dd MMM yyyy", { locale: idLocale })}
</td>
```

### Progress Bar
```tsx
<div className="w-full bg-gray-200 rounded-full h-1.5">
  <div
    className="bg-green-500 h-1.5 rounded-full transition-all"
    style={{ width: `${Math.min(progress, 100)}%` }}
  ></div>
</div>
<div className="text-xs text-gray-500 mt-1 mono">
  {progress.toFixed(0)}%
</div>
```

### Status Badge
```tsx
<span className={`px-2 py-1 text-xs font-medium rounded-full ${
  status === "active"
    ? "bg-success-50 text-success-700"
    : status === "draft"
    ? "bg-gray-100 text-gray-700"
    : "bg-danger-50 text-danger-700"
}`}>
  {status}
</span>
```

## 10. Helper Functions

### formatRupiah
```tsx
// lib/format.ts
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}
```

Usage:
```tsx
Rp {formatRupiah(300000000)}  // Output: Rp 300.000.000
```

### Date Formatting
```tsx
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

{format(new Date(date), "EEEE, dd MMM yyyy", { locale: idLocale })}
// Output: Senin, 20 Jan 2025
```

## 11. Implementation Checklist

Saat membuat table baru, pastikan:

- [ ] Import SCSS: `_table.scss` dan `_table-mobile.scss` di `main.scss`
- [ ] Desktop table menggunakan class `.table-container` > `.table`
- [ ] Mobile cards menggunakan class `.table-mobile-cards` > `.table-card`
- [ ] Action buttons menggunakan class `.action-btn` dengan modifier
- [ ] Currency menggunakan class `.mono` dan helper `formatRupiah()`
- [ ] Date menggunakan format Indonesia dengan `date-fns`
- [ ] Status badges menggunakan warna konsisten
- [ ] Progress bar (jika ada) menggunakan struktur standar
- [ ] Responsive breakpoint di 1024px
- [ ] Empty state message ketika `data.length === 0`

## 12. Example Use Cases

### Campaigns Table
- Title + Category
- Goal + Collected dengan progress bar
- Donors count
- Status badge
- Created date
- Action buttons (View, Edit, Delete)

### Donations Table
- Donor name + email
- Campaign title
- Amount
- Payment method
- Status
- Date
- Action buttons

### Users Table
- Name + email
- Role badge
- Last login
- Status
- Action buttons

## 13. Best Practices

1. **Consistency**: Selalu gunakan class names yang sama untuk komponen yang sama
2. **Accessibility**: Tambahkan `title` attribute pada action buttons
3. **Performance**: Gunakan `key` prop yang unik (preferably database ID)
4. **Loading State**: Tambahkan skeleton loader saat data loading
5. **Empty State**: Tampilkan pesan yang jelas saat tidak ada data
6. **Error Handling**: Tampilkan error message jika API request gagal
7. **Progressive Enhancement**: Desktop table sebagai default, mobile cards sebagai enhancement

## 14. Don'ts

❌ **JANGAN** gunakan inline styles kecuali untuk dynamic values (progress bar width, dll)
❌ **JANGAN** buat custom table styles, gunakan yang sudah ada
❌ **JANGAN** hardcode warna, gunakan SCSS variables
❌ **JANGAN** gunakan pixel values, gunakan SCSS spacing variables
❌ **JANGAN** lupa menambahkan responsive mobile cards
❌ **JANGAN** gunakan format angka/tanggal yang berbeda-beda

## 15. Maintenance

Jika perlu update table styles:
1. Edit di `_table.scss` atau `_table-mobile.scss`
2. Perubahan akan otomatis apply ke semua table
3. Test di berbagai screen sizes (desktop, tablet, mobile)
4. Pastikan tidak break existing tables

---

**Version**: 1.0
**Last Updated**: 2025-01-18
**Maintained by**: Development Team
