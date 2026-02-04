# Bantuanku Admin Dashboard

## CSS Architecture

Structured SCSS + Tailwind CSS untuk maintainability maksimal.

### Struktur Folder

```
src/styles/
├── main.scss                 # Entry point
├── base/                     # Base styles
│   ├── _reset.scss          # Custom reset
│   └── _typography.scss     # Typography classes
├── components/              # Reusable components
│   ├── _buttons.scss
│   ├── _cards.scss
│   ├── _forms.scss
│   └── _table.scss
├── layouts/                 # Layout styles
│   ├── _sidebar.scss
│   └── _dashboard.scss
├── pages/                   # Page-specific styles
│   └── _login.scss
└── utils/                   # Variables & mixins
    ├── _variables.scss      # SCSS variables
    └── _mixins.scss         # SCSS mixins
```

### Cara Pakai

#### 1. Pakai SCSS Classes (Custom Components)

```tsx
// Gunakan class dari SCSS
<button className="btn btn-primary btn-md">
  Save
</button>

<div className="card">
  <div className="card-header">
    <h3 className="card-title">Title</h3>
  </div>
  <div className="card-body">
    Content
  </div>
</div>
```

#### 2. Pakai Tailwind Utilities (Quick Styling)

```tsx
// Gunakan Tailwind classes
<div className="flex items-center gap-4 p-6">
  <div className="w-12 h-12 bg-primary-500 rounded-lg" />
  <span className="text-gray-900 font-medium">Label</span>
</div>
```

#### 3. Kombinasi (Best Practice)

```tsx
// Mix SCSS + Tailwind
<div className="card">
  <div className="flex justify-between items-center mb-4">
    <h3 className="heading-3">Title</h3>
    <button className="btn btn-primary">Action</button>
  </div>
  <p className="text-muted">Description</p>
</div>
```

### SCSS Variables

```scss
// Colors
$primary-600: #0284c7;
$success-600: #16a34a;
$danger-600: #dc2626;

// Spacing
$spacing-xs: 0.25rem;
$spacing-sm: 0.5rem;
$spacing-md: 1rem;
$spacing-lg: 1.5rem;
$spacing-xl: 2rem;

// Shadows
$shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
$shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
```

### SCSS Mixins

```scss
// Flexbox
@include flex-center;    // display: flex; align/justify: center
@include flex-between;   // justify-content: space-between
@include flex-column;    // flex-direction: column

// Truncate
@include truncate;       // text-overflow: ellipsis
@include line-clamp(2);  // 2-line clamp

// Card
@include card;          // Card base styles

// Responsive
@include mobile { ... }
@include tablet { ... }
@include desktop { ... }
```

## Kapan Pakai Apa?

### Pakai SCSS Custom Classes Untuk:
- ✅ Component styling yang reusable (buttons, cards, forms)
- ✅ Complex patterns yang sering dipakai
- ✅ Component-specific styles dengan banyak variants
- ✅ Animations & transitions

### Pakai Tailwind Utilities Untuk:
- ✅ Quick spacing (p-4, m-2, gap-6)
- ✅ Layout (flex, grid)
- ✅ One-off styling
- ✅ Responsive modifiers (md:flex, lg:grid-cols-4)

### ❌ JANGAN Pakai Inline Styles
- Hindari `style={{ }}` kecuali dynamic values dari props/state

## Examples

### Button Component
```tsx
// SCSS approach
<button className="btn btn-primary btn-lg">
  Click Me
</button>

// Tailwind approach
<button className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
  Click Me
</button>
```

### Card Component
```tsx
// SCSS approach (recommended untuk consistency)
<div className="card">
  <div className="card-header">
    <h3 className="card-title">Title</h3>
  </div>
  <div className="card-body">
    <p className="text-muted">Content</p>
  </div>
</div>

// Mixed approach (common)
<div className="card">
  <div className="flex justify-between items-center mb-6">
    <h3 className="heading-3">Title</h3>
    <button className="btn btn-sm btn-outline">Edit</button>
  </div>
  <div className="space-y-4">
    <p className="text-sm text-gray-600">Content</p>
  </div>
</div>
```

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build
npm run build
```

File SCSS akan auto-compile oleh Next.js dengan SASS loader.
