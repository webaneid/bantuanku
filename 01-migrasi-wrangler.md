# Migrasi Wrangler → Full Node

## 1) Lokasi & Jejak Wrangler Saat Ini
- **Konfigurasi**: `apps/api/wrangler.toml` (main `src/index.ts`, flag `nodejs_compat`, dev port 50245, vars ENVIRONMENT/API_URL).
- **Script npm**: `apps/api/package.json` → `dev`=`wrangler dev`, `deploy`=`wrangler deploy --minify`, `cf-typegen`=`wrangler types`.
- **Dokumen terkait**: `docs/CONFIGURATION.md`, `DEPLOYMENT.md`, `SETUP.md`, `00-helper-media-library.md` (menyebut wrangler), `00-blueprint-bantuanku-planning.md` (flow dev wrangler).
- **Runtime alternatif Node**: `apps/api/server-node.ts` sudah ada (pakai Hono `serve` + `.dev.vars`).
- **Dependensi**: `package-lock.json` memuat `wrangler` v3.114.17 (per lock).

## 2) Checklist Migrasi
1. **Runtime & Start Command**
   - Ganti entry dev/prod API ke Node:
     - Dev: `npm run dev:node --workspace=@bantuanku/api` (pakai `server-node.ts`).
     - Prod: buat script `start` (node/tsx) atau pakai PM2/docker.
   - Pastikan `main`/build output disesuaikan (ts-node/tsx atau transpile to dist).

2. **Env & Secrets**
   - Pindahkan variabel dari `wrangler.toml` & `wrangler secret` ke `.env`/`.dev.vars` dan ke sistem env (docker/PM2/CI).
   - Pastikan `DATABASE_URL`, `JWT_SECRET`, `API_URL`, dll terbaca oleh Node (sudah di `server-node.ts`).

3. **Static & Uploads**
   - Folder `apps/api/uploads` dibuat di `server-node.ts`; pastikan mount/persistent storage di prod.
   - Cek CDN/GCS logic (`extractPath`, `media` route) tetap jalan di Node tanpa worker KV/R2.

4. **Build & Compatibility**
   - Hilangkan ketergantungan `nodejs_compat` (sudah native Node).
   - Audit penggunaan API worker (KV, D1, R2, Durable Objects) — tidak ada yang aktif di `wrangler.toml`; jika ada code yang akses `c.env`, ganti ke `process.env` (server-node sudah injeksi env ke Hono).

5. **CI/CD**
   - Ubah pipeline: hapus `wrangler deploy`, ganti ke build+start (docker/PM2).
   - Tambah healthcheck endpoint & service unit file jika pakai systemd/PM2.

6. **Logging & Observability**
   - Ganti `wrangler tail` dengan log collector Node (stdout, pm2-logrotate).
   - Pastikan error handler Hono tetap mencetak stack di Node.

7. **Dokumentasi & Cleanup**
   - Update `docs/CONFIGURATION.md`, `DEPLOYMENT.md`, `SETUP.md` untuk Node flow.
   - Opsional: hapus `wrangler.toml` & dependency `wrangler` setelah yakin tidak dipakai.

## 3) Rencana Eksekusi Singkat
1) **Phase 1 – Parallel Test**: jalankan `npm run dev:node` dan uji semua endpoint/uploads.  
2) **Phase 2 – Script Update**: ubah `apps/api/package.json` scripts (`dev`, `start`, remove wrangler).  
3) **Phase 3 – CI/CD**: buat workflow build+start (docker/PM2) dan set env secrets.  
4) **Phase 4 – Decommission**: hapus `wrangler.toml`/deps & bersihkan dokumen wrangler.  
5) **Phase 5 – Verify**: regression test (auth, media upload, qurban/zakat/donasi flows).
