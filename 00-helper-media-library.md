# Media Library - Dokumentasi & Standar

## ⚠️ PENTING - JANGAN DIUBAH

Dokumentasi ini menjelaskan arsitektur media library yang **HARUS KONSISTEN** agar tidak rusak setiap kali environment berubah.

---

## 🏗️ Arsitektur

```
┌─────────────────────────────────┐
│  Frontend (Next.js)             │
│  http://localhost:3001          │
│                                 │
│  - Render HTML/React            │
│  - <img src="API_URL/..." />    │
└────────────┬────────────────────┘
             │
             │ Request gambar
             ▼
┌─────────────────────────────────┐
│  API Server (Hono/Wrangler)     │
│  http://localhost:50245         │
│                                 │
│  - Serve static files           │
│  - GET /uploads/:filename       │
│  - File fisik: apps/api/uploads/│
└─────────────────────────────────┘
```

---

## ✅ Prinsip Utama (WAJIB DIIKUTI)

### 1. **Database HANYA Simpan PATH, BUKAN Full URL**

❌ **SALAH**:
```typescript
// Database: url = "http://localhost:50245/uploads/file.png"
// Problem: Rusak jika port/domain berubah
```

✅ **BENAR**:
```typescript
// Database: url = "/uploads/file.png"
// Database: path = "/uploads/file.png"
// URL di-construct saat runtime
```

### 2. **URL Di-construct Saat Runtime**

```typescript
// Backend saat GET
const apiUrl = c.env.API_URL || "http://localhost:50245";
const fullUrl = `${apiUrl}${path}`; // Combine saat serve

// Response ke frontend
{
  id: "123",
  url: "http://localhost:50245/uploads/file.png", // Full URL untuk frontend
  path: "/uploads/file.png" // Path dari database
}
```

### 3. **Frontend Terima Full URL, Backend Extract Path**

```typescript
// Frontend kirim full URL
onSelect("http://localhost:50245/uploads/file.png")

// Backend extract path sebelum simpan
const path = extractPath(url); // → "/uploads/file.png"
await db.insert(...).values({ path }); // Simpan path saja
```

---

## 📁 File Locations

```
bantuanku/
├── apps/
│   ├── api/
│   │   ├── uploads/              ← File fisik disimpan di sini
│   │   │   └── 1234567890-file.png
│   │   ├── src/
│   │   │   ├── index.ts          ← Endpoint GET /uploads/:filename
│   │   │   └── routes/admin/
│   │   │       └── media.ts      ← Upload & GET /admin/media
│   │   └── wrangler.toml         ← API_URL env var
│   └── admin/
│       └── src/
│           └── components/
│               └── MediaLibrary.tsx  ← UI component
└── packages/
    └── db/
        └── src/schema/
            └── media.ts          ← Schema (url & path columns)
```

---

## 🔧 Implementation Details

### Backend - Upload Handler

**File**: `apps/api/src/routes/admin/media.ts`

```typescript
// Helper function - WAJIB pakai ini
export const extractPath = (urlOrPath: string): string => {
  if (!urlOrPath) return "";
  if (urlOrPath.startsWith("/")) return urlOrPath; // Already path
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    try {
      const url = new URL(urlOrPath);
      return url.pathname; // Extract path
    } catch {
      const match = urlOrPath.match(/\/uploads\/.+$/);
      return match ? match[0] : urlOrPath;
    }
  }
  return urlOrPath;
};

// Upload endpoint
app.post("/upload", async (c) => {
  // ... file upload logic ...

  const path = `/uploads/${filename}`;

  // ✅ BENAR: Simpan PATH saja
  await db.insert(mediaTable).values({
    url: path,  // PATH, bukan full URL
    path: path,
  });

  // Construct full URL untuk response
  const apiUrl = c.env.API_URL || "http://localhost:50245";
  return c.json({
    url: `${apiUrl}${path}`, // Full URL untuk frontend
  });
});

// GET endpoint
app.get("/", async (c) => {
  const result = await db.select().from(mediaTable);
  const apiUrl = c.env.API_URL || "http://localhost:50245";

  // ✅ BENAR: Construct URL saat serve
  const data = result.map((item) => ({
    ...item,
    url: `${apiUrl}${item.path}`, // Combine di runtime
  }));

  return c.json({ data });
});
```

### Backend - Serve Static Files

**File**: `apps/api/src/index.ts`

```typescript
// Endpoint untuk serve file fisik
app.get("/uploads/:filename", async (c) => {
  const filename = c.req.param("filename");

  // Load from filesystem
  const filePath = pathModule.join(process.cwd(), "uploads", filename);
  const file = fs.readFileSync(filePath);

  // Determine content type
  const ext = filename.split(".").pop()?.toLowerCase();
  const contentType = contentTypes[ext || ""] || "application/octet-stream";

  return new Response(file, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000",
    },
  });
});
```

### Frontend - MediaLibrary Component

**File**: `apps/admin/src/components/MediaLibrary.tsx`

```typescript
interface MediaLibraryProps {
  onSelect: (url: string) => void; // Terima full URL
  category?: "general" | "financial" | "activity" | "document";
}

// Component mengirim full URL ke parent
const handleInsert = () => {
  onSelect(tempSelectedUrl); // Full URL: http://localhost:50245/...
};
```

### Usage Example - Order Form

**File**: `apps/admin/src/app/dashboard/qurban/orders/page.tsx`

```typescript
const [formData, setFormData] = useState({
  payment_proof_url: "", // Simpan full URL di state
});

// Media Library callback
<MediaLibrary
  onSelect={(url) => {
    setFormData({ ...formData, payment_proof_url: url }); // Full URL
  }}
  category="financial"
/>

// Submit ke backend
const handleSubmit = async () => {
  await api.post("/admin/qurban/orders", {
    paymentProofUrl: formData.payment_proof_url, // Kirim full URL
  });
};
```

### Backend - Save Payment Proof

**File**: `apps/api/src/routes/admin/qurban.ts`

```typescript
import { extractPath } from "./media";

app.post("/orders", async (c) => {
  const body = await c.req.json();

  // ✅ BENAR: Extract path dari full URL
  await db.insert(qurbanPayments).values({
    paymentProof: body.paymentProofUrl
      ? extractPath(body.paymentProofUrl)  // Extract path
      : null,
  });
});

// GET dengan construct URL
app.get("/orders/:id", async (c) => {
  const payments = await db.select().from(qurbanPayments);
  const apiUrl = c.env.API_URL || "http://localhost:50245";

  // ✅ BENAR: Construct URL saat serve
  const paymentsWithUrls = payments.map((payment) => ({
    ...payment,
    paymentProof: payment.paymentProof
      ? `${apiUrl}${payment.paymentProof}`
      : null,
  }));

  return c.json({ payments: paymentsWithUrls });
});
```

---

## 🌍 Environment Variables

**File**: `apps/api/wrangler.toml`

```toml
[vars]
API_URL = "http://localhost:50245"  # Development

# Production
# API_URL = "https://api.bantuanku.org"
```

---

## 📋 Checklist - Implementasi Baru

Setiap kali menambahkan fitur upload/media baru:

- [ ] Database simpan **PATH saja** (`/uploads/...`), BUKAN full URL
- [ ] Gunakan `extractPath()` helper saat save ke database
- [ ] Construct full URL saat GET/serve (`${API_URL}${path}`)
- [ ] Frontend kirim full URL, backend extract path
- [ ] Test: Ganti port API, URL tetap work
- [ ] File fisik tersimpan di `apps/api/uploads/`

---

## ❌ Common Mistakes (JANGAN DILAKUKAN)

### Mistake 1: Simpan Full URL di Database
```typescript
❌ await db.insert(...).values({
  url: "http://localhost:50245/uploads/file.png"
});

✅ await db.insert(...).values({
  url: extractPath(urlFromFrontend) // "/uploads/file.png"
});
```

### Mistake 2: Hardcode Host/Port
```typescript
❌ const url = "http://localhost:8787" + path;

✅ const apiUrl = c.env.API_URL || "http://localhost:50245";
   const url = `${apiUrl}${path}`;
```

### Mistake 3: Update Database URL Setiap Restart
```typescript
❌ // Don't auto-update URLs on every request
   await db.update(media).set({ url: newUrl });

✅ // URL di-construct saat serve, tidak perlu update database
   return { ...item, url: `${apiUrl}${item.path}` };
```

---

## 🧪 Testing

### Manual Test
1. Upload file via MediaLibrary
2. Cek database: `url` dan `path` harus `/uploads/...` (path saja)
3. GET `/admin/media`: Response harus full URL `http://...`
4. Gambar bisa diload di browser
5. Restart API server dengan port berbeda
6. Gambar tetap bisa diload (URL otomatis update)

### SQL Check
```sql
-- Cek isi database
SELECT id, url, path FROM media LIMIT 5;

-- ✅ BENAR: url dan path adalah path saja
-- id   | url                      | path
-- -----+--------------------------+-------------------------
-- 123  | /uploads/123-file.png    | /uploads/123-file.png

-- ❌ SALAH: url berisi full URL
-- 123  | http://localhost:50245/uploads/123-file.png | /uploads/...
```

---

## 🚀 Production Deployment

### Environment Variables
```toml
# Development
API_URL = "http://localhost:50245"

# Staging
API_URL = "https://api-staging.bantuanku.org"

# Production
API_URL = "https://api.bantuanku.org"
```

### Storage
- **Development**: File di filesystem (`apps/api/uploads/`)
- **Production**: Gunakan R2/S3/Cloud Storage
- **Code tetap sama**: Simpan path, construct URL saat runtime

### ⚠️ Image Processing (Category: General)

#### Development (Node.js Server)
```bash
# Gunakan dev:node untuk Sharp support
npm run dev:node --workspace=@bantuanku/api
```

**Fitur aktif:**
- ✅ Auto crop center ke rasio 4:3
- ✅ Convert ke WebP (80% quality)
- ✅ Ukuran file lebih kecil

**Kode**: `apps/api/src/routes/admin/media.ts` (line 213-228)

#### Production (Cloudflare Workers)

**PENTING**: Sharp **TIDAK BISA** jalan di Cloudflare Workers karena menggunakan native binary.

**Pilihan solusi:**

1. **Cloudflare Images** (Recommended):
   ```typescript
   // Upload ke Cloudflare Images API
   // Gunakan Image Resizing & Transformations
   // URL: https://developers.cloudflare.com/images/
   ```

2. **Pre-processing di CI/CD**:
   ```bash
   # GitHub Actions: process images sebelum deploy
   - name: Process images
     run: node scripts/process-images.js
   ```

3. **External Service**:
   - Imgix, Cloudinary, atau ImageKit
   - Upload raw, return processed URL

4. **Disable Processing** (Fallback):
   ```typescript
   // Image processing akan skip jika Sharp not available
   // File disimpan original (jpeg/png)
   ```

**Status saat ini**: Processing otomatis skip di Cloudflare Workers, file disimpan original.

**File terkait**:
- `apps/api/package.json`: Sharp di `optionalDependencies`
- `apps/api/server-node.ts`: Node.js dev server
- `apps/api/src/routes/admin/media.ts`: processGeneralImage()

---

## 📞 Troubleshooting

### Problem: Gambar 404 Not Found
**Cek**:
1. File fisik ada di `apps/api/uploads/`?
2. API server running di port yang benar?
3. `API_URL` environment variable sudah di-set?
4. Path di database benar (`/uploads/...`)?

### Problem: Gambar rusak setelah restart
**Penyebab**: Database menyimpan full URL, bukan path
**Fix**:
1. Update kode upload untuk simpan path saja
2. Migrate data lama: extract path dari full URL
3. Test: Restart server, gambar tetap work

### Problem: MediaLibrary tidak muncul
**Cek**:
1. `isOpen={true}` props?
2. `onSelect` callback defined?
3. Category filter benar?

---

## 📝 Summary

### DO ✅
- Simpan PATH di database (`/uploads/...`)
- Construct URL saat runtime (`${API_URL}${path}`)
- Gunakan `extractPath()` helper
- File fisik di `apps/api/uploads/`
- Environment variable untuk `API_URL`

### DON'T ❌
- Simpan full URL di database
- Hardcode host/port
- Auto-update database URLs
- Simpan file di frontend folder

---

**Terakhir diupdate**: 25 Januari 2026
**Author**: Development Team
**Status**: ⚠️ CRITICAL - DO NOT MODIFY WITHOUT REVIEW
