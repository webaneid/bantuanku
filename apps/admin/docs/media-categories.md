# Media Library Categories

## Overview
Media library menggunakan sistem kategori untuk memisahkan file berdasarkan fungsi dan konteksnya. Ini memastikan admin finance tidak perlu melihat foto kegiatan, dan admin campaign tidak perlu melihat dokumen keuangan.

## Kategori Media

### 1. **general** (Default)
**Digunakan untuk**: Media umum campaign, banner, logo, dll
- **File types**: Images only (JPG, PNG, GIF, WebP)
- **Max size**: 5MB
- **Akses**: Semua admin
- **Contoh penggunaan**:
  - Banner campaign
  - Foto campaign utama
  - Logo organisasi
  - Ilustrasi artikel

### 2. **financial**
**Digunakan untuk**: Dokumen keuangan dan bukti transaksi
- **File types**: Images dan PDF (JPG, PNG, PDF)
- **Max size**: 5MB
- **Akses**: Finance admin only
- **Contoh penggunaan**:
  - Nota pembelian (🧾)
  - Invoice vendor (📄)
  - Kwitansi tanda terima (🧾)
  - Bukti transfer bank (💳)
  - Laporan keuangan (📄)

**Mapping ke Evidence Type**:
```typescript
financial → evidence.type = "receipt" | "invoice"
```

### 3. **activity**
**Digunakan untuk**: Dokumentasi kegiatan dan program
- **File types**: Images only (JPG, PNG)
- **Max size**: 5MB
- **Akses**: Campaign admin + Finance admin (untuk verifikasi)
- **Contoh penggunaan**:
  - Foto kegiatan program (📸)
  - Foto penerima bantuan (📸)
  - Dokumentasi distribusi (📸)
  - Behind the scenes

**Mapping ke Evidence Type**:
```typescript
activity → evidence.type = "photo"
```

### 4. **document**
**Digunakan untuk**: Dokumen administrasi dan legal
- **File types**: Images dan PDF (JPG, PNG, PDF)
- **Max size**: 5MB
- **Akses**: Admin + Finance
- **Contoh penggunaan**:
  - Surat pernyataan penerima (📋)
  - Daftar penerima bantuan Excel/PDF (📋)
  - Surat keterangan lembaga (📋)
  - Kontrak/MOU (📋)
  - Proposal program (📋)

**Mapping ke Evidence Type**:
```typescript
document → evidence.type = "document"
```

## API Usage

### Upload dengan Category
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('category', 'financial'); // ⚠️ WAJIB set category

const response = await api.post('/admin/media/upload', formData);
```

### Filter by Category
```typescript
// Get hanya media financial
GET /admin/media?category=financial

// Get hanya media activity
GET /admin/media?category=activity

// Get semua media
GET /admin/media
```

## Integration dengan Disbursement Evidence

Saat upload evidence untuk disbursement, gunakan mapping berikut:

```typescript
// Schema evidence
type: "receipt" | "invoice" | "photo" | "document"

// Mapping ke media category
const categoryMap = {
  receipt: "financial",   // 🧾 Nota/Struk
  invoice: "financial",   // 📄 Invoice
  photo: "activity",      // 📸 Foto Kegiatan
  document: "document",   // 📋 Dokumen
};
```

## Frontend Component Example

```typescript
// MediaLibraryModal.tsx
interface MediaLibraryModalProps {
  category?: "general" | "financial" | "activity" | "document";
  onSelect: (media: Media) => void;
}

// Usage untuk financial evidence
<MediaLibraryModal
  category="financial"  // Hanya tampilkan financial docs
  onSelect={(media) => {
    // User hanya bisa pilih nota/invoice
    setEvidenceFile(media);
  }}
/>

// Usage untuk activity photo
<MediaLibraryModal
  category="activity"   // Hanya tampilkan foto kegiatan
  onSelect={(media) => {
    setActivityPhoto(media);
  }}
/>
```

## Access Control (Future)

```typescript
// Berdasarkan user role
const userRole = user.roles[0];

const allowedCategories = {
  super_admin: ["general", "financial", "activity", "document"],
  finance: ["financial", "document"],
  campaign_admin: ["general", "activity"],
  content_writer: ["general"],
};

// Filter media berdasarkan role
const categories = allowedCategories[userRole];
GET /admin/media?category=${categories.join(",")}
```

## Best Practices

### ✅ DO:
- Selalu set category saat upload
- Gunakan kategori sesuai fungsi file
- Filter media by category di UI untuk fokus
- Validate file type sesuai category di backend

### ❌ DON'T:
- Upload bukti finansial sebagai "general"
- Upload foto kegiatan sebagai "financial"
- Mix category untuk file sejenis
- Skip category validation

## Migration dari Data Lama

```sql
-- Update existing media tanpa category
UPDATE media
SET category = 'general'
WHERE category IS NULL;

-- Migrate based on folder/filename pattern
UPDATE media
SET category = 'financial'
WHERE folder LIKE '%invoice%' OR folder LIKE '%receipt%';

UPDATE media
SET category = 'activity'
WHERE folder LIKE '%photo%' OR folder LIKE '%kegiatan%';
```

## Summary

| Category | File Types | Use Case | Admin Access |
|----------|-----------|----------|--------------|
| `general` | Images | Campaign media, banners | All |
| `financial` | Images, PDF | Nota, invoice, transfer | Finance only |
| `activity` | Images | Foto kegiatan, dokumentasi | Campaign + Finance |
| `document` | Images, PDF | Surat, legal docs | Admin + Finance |

---

**Version**: 1.0
**Last Updated**: 2026-01-19
**Maintained by**: Development Team
