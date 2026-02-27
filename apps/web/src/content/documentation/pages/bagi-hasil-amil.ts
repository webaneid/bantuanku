import type { DocumentationPage } from "../types";

export const amilRevenueDoc: DocumentationPage = {
    slug: "bagi-hasil-amil",
    title: "Sistem Bagi Hasil Amil",
    category: "Keuangan",
    summary:
        "Panduan lengkap revenue sharing: aturan syariat, formula per produk, pengecualian wakaf & qurban, settings, dan laporan.",
    updatedAt: "2026-02-20",
    sections: [
        {
            id: "pengertian",
            heading: "Pengertian & Prinsip Dasar",
            bodyHtml:
                '<p>Sistem <strong>Bagi Hasil Amil</strong> mengatur pembagian otomatis dari setiap donasi yang masuk. Setiap kali pembayaran dikonfirmasi (<strong>paid</strong>), sistem menghitung dan mencatat pembagian untuk masing-masing pihak.</p>' +
                '<h4 style="margin-top:16px;">Pihak yang Terlibat</h4>' +
                '<table style="width:100%; border-collapse:collapse; margin:12px 0;">' +
                '<thead><tr style="background:#f3f4f6;"><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Pihak</th><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Peran</th></tr></thead>' +
                '<tbody>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Amil</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">Yayasan pemilik platform Bantuanku. Mengambil persentase dari donasi sesuai batas syariat.</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Platform Provider</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">Fee platform (biaya operasional teknologi). Dipotong dari <em>bagian amil</em>, bukan dari dana program.</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Influencer</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">Penggalang dana yang mereferensikan donatur via link referral. Komisi dipotong dari <em>bagian amil</em>, hanya jika transaksi melalui referral.</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Mitra</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">Lembaga/organisasi pemilik program. Mendapat bagi hasil dari <em>bagian amil</em> sesuai pengaturan.</td></tr>' +
                '</tbody></table>' +
                '<p>💡 <strong>Penting:</strong> Seluruh potongan (platform provider, influencer, mitra) diambil dari <strong>bagian amil</strong>, bukan dari dana program/mustahiq. Dana program selalu utuh sesuai persentase yang ditetapkan.</p>',
        },
        {
            id: "aturan-syariat",
            heading: "Aturan Syariat per Produk",
            bodyHtml:
                '<p>Tidak semua produk boleh dipotong. Berikut aturan yang <strong>wajib dipatuhi</strong> sesuai syariat Islam:</p>' +
                '<table style="width:100%; border-collapse:collapse; margin:16px 0;">' +
                '<thead><tr style="background:#f3f4f6;"><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Produk</th><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Boleh Dipotong?</th><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Batas</th><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Keterangan</th></tr></thead>' +
                '<tbody>' +
                '<tr style="background:#dcfce7;"><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Shodaqoh / Donasi</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">✅ Ya</td><td style="padding:10px; border:1px solid #e5e7eb;">Max 20%</td><td style="padding:10px; border:1px solid #e5e7eb;">Ada batas persentase, amil dapat sisa setelah potongan</td></tr>' +
                '<tr style="background:#dcfce7;"><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Zakat</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">✅ Ya</td><td style="padding:10px; border:1px solid #e5e7eb;">Max 12.5%</td><td style="padding:10px; border:1px solid #e5e7eb;">Batas syariat ⅛ (seperdelapan), amil dapat sisa setelah potongan</td></tr>' +
                '<tr style="background:#fee2e2;"><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Fidyah</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">🚫 <strong>TIDAK BOLEH</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">—</td><td style="padding:10px; border:1px solid #e5e7eb;">100% utuh, disalurkan penuh sebagai pengganti ibadah puasa</td></tr>' +
                '<tr style="background:#fef9c3;"><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Qurban<br/><small>(admin fee)</small></strong></td><td style="padding:10px; border:1px solid #e5e7eb;">✅ Khusus</td><td style="padding:10px; border:1px solid #e5e7eb;">Nominal tetap</td><td style="padding:10px; border:1px solid #e5e7eb;">Hanya admin fee yang dibagi; owner app + sisa mitra. Harga hewan tetap utuh.</td></tr>' +
                '<tr style="background:#fee2e2;"><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Wakaf</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">🚫 <strong>TIDAK BOLEH</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">—</td><td style="padding:10px; border:1px solid #e5e7eb;">100% utuh, tidak boleh dipotong siapapun (amil, platform provider, influencer, mitra)</td></tr>' +
                '<tr style="background:#fee2e2;"><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Qurban<br/><small>(harga hewan)</small></strong></td><td style="padding:10px; border:1px solid #e5e7eb;">🚫 <strong>TIDAK BOLEH</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">—</td><td style="padding:10px; border:1px solid #e5e7eb;">100% utuh untuk pembelian hewan dan proses penyembelihan</td></tr>' +
                '</tbody></table>',
        },
        {
            id: "pengecualian",
            heading: "Pengecualian: Wakaf & Qurban",
            bodyHtml:
                '<h4>🚫 Wakaf — 100% Tidak Boleh Diambil</h4>' +
                '<p>Uang <strong>wakaf</strong> bersifat sakral. Dana wajib didistribusikan 100% kepada tujuan wakaf tanpa potongan apapun.</p>' +
                '<div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:16px; margin:12px 0;">' +
                '<p style="margin:0;"><strong>Contoh Wakaf Rp 10.000.000:</strong></p>' +
                '<ul style="margin:8px 0 0;">' +
                '<li>Amil = Rp 0 (TIDAK ADA)</li>' +
                '<li>Platform Provider = Rp 0 (TIDAK ADA)</li>' +
                '<li>Influencer = Rp 0 (TIDAK ADA)</li>' +
                '<li>Mitra = Rp 0 (TIDAK ADA)</li>' +
                '<li><strong>Dana Wakaf = Rp 10.000.000 (100% utuh)</strong></li>' +
                '</ul></div>' +
                '<p>Sistem mendeteksi otomatis: jika campaign bertipe pilar <strong>wakaf</strong>, seluruh revenue sharing di-<em>skip</em>.</p>' +
                '<h4 style="margin-top:20px;">🚫 Fidyah — 100% Tidak Boleh Diambil</h4>' +
                '<p>Sama halnya dengan wakaf, dana <strong>fidyah</strong> merupakan pengganti ibadah wajib (puasa) yang harus disalurkan secara utuh 100% kepada fakir miskin. Fidyah tidak boleh dikenakan potongan amil, platform provider, influencer, maupun mitra.</p>' +
                '<h4 style="margin-top:20px;">🚫 Qurban — Harga Hewan Tidak Boleh Diambil</h4>' +
                '<p>Uang pembayaran hewan qurban <strong>tidak boleh dipotong</strong>. Seluruh uang digunakan untuk pembelian hewan dan penyembelihan.</p>' +
                '<p>Namun, <strong>biaya administrasi</strong> per ekor (nominal tetap dalam Rupiah) menggunakan model pembagian khusus:</p>' +
                '<div style="background:#fefce8; border:1px solid #fde68a; border-radius:8px; padding:16px; margin:12px 0;">' +
                '<p style="margin:0;"><strong>Contoh Qurban Kambing Rp 3.500.000, Admin Rp 1.000.000, Owner App 20%:</strong></p>' +
                '<ul style="margin:8px 0 0;">' +
                '<li>Uang Hewan = Rp 3.500.000 (100% utuh)</li>' +
                '<li>Admin Fee = Rp 1.000.000</li>' +
                '<li>├── Owner App = Rp 1.000.000 × 20% = <strong>Rp 200.000</strong></li>' +
                '<li>└── Sisa Mitra = Rp 1.000.000 - Rp 200.000 = <strong>Rp 800.000</strong></li>' +
                '</ul></div>',
        },
        {
            id: "formula",
            heading: "Formula Perhitungan",
            bodyHtml:
                '<h4>Formula A: Campaign / Zakat (Ada Cap %)</h4>' +
                '<p>Amil dibatasi maksimal X% dari donasi. Dari bagian X% itu, dipotong platform provider, influencer, dan mitra. Sisanya menjadi hak amil.</p>' +
                '<div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:16px; margin:12px 0; font-family: monospace; font-size:13px; line-height:1.8;">' +
                'Donasi Masuk = <strong>Rp D</strong><br/>' +
                'Bagian Amil (total) = D × X% <span style="color:#6b7280;">← ADA BATAS MAKSIMAL</span><br/>' +
                '├── Platform Provider Fee = D × Platform Provider%<br/>' +
                '├── Influencer = D × Influencer% <span style="color:#6b7280;">(jika via referral)</span><br/>' +
                '├── Mitra = D × Mitra% <span style="color:#6b7280;">(jika campaign/zakat mitra)</span><br/>' +
                '└── <strong>Sisa Amil = Bagian Amil - Platform Provider - Influencer - Mitra</strong><br/><br/>' +
                '<strong>Dana Program = D - Bagian Amil</strong>' +
                '</div>' +

                '<h4 style="margin-top:20px;">Formula B: Qurban Admin Fee (Owner App + Mitra)</h4>' +
                '<p>Admin fee qurban dibagi dua: porsi pemilik aplikasi dan sisa untuk mitra pemilik paket qurban.</p>' +
                '<div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px; margin:12px 0; font-family: monospace; font-size:13px; line-height:1.8;">' +
                'Admin Fee = <strong>Rp A</strong> <span style="color:#6b7280;">(nominal tetap dari settings)</span><br/>' +
                '├── Owner App = A × amil_qurban_owner_percentage<br/>' +
                '└── <strong>Mitra Qurban = A - Owner App</strong><br/><br/>' +
                'Uang Hewan = totalAmount - adminFee <span style="color:#6b7280;">(100% utuh)</span>' +
                '</div>',
        },
        {
            id: "skenario",
            heading: "Skenario Bagi Hasil",
            bodyHtml:
                '<h4>Skenario 1: Campaign Sendiri + Tanpa Referral</h4>' +
                '<p>Campaign dibuat yayasan, donatur datang langsung.</p>' +
                '<div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin:8px 0; font-family: monospace; font-size:13px; line-height:1.6;">' +
                'Donasi: Rp 1.000.000 | X% (shodaqoh): 20%<br/><br/>' +
                'Bagian Amil = Rp 200.000<br/>' +
                '├── Platform Provider (2.5%) = Rp 25.000<br/>' +
                '├── Influencer = Rp 0<br/>' +
                '├── Mitra = Rp 0<br/>' +
                '└── Sisa Amil = <strong>Rp 175.000</strong><br/><br/>' +
                'Dana Program = <strong>Rp 800.000</strong>' +
                '</div>' +

                '<h4 style="margin-top:16px;">Skenario 2: Campaign Sendiri + Dengan Referral</h4>' +
                '<p>Campaign yayasan, donatur datang via link influencer.</p>' +
                '<div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin:8px 0; font-family: monospace; font-size:13px; line-height:1.6;">' +
                'Donasi: Rp 1.000.000 | X% (shodaqoh): 20%<br/><br/>' +
                'Bagian Amil = Rp 200.000<br/>' +
                '├── Platform Provider (2.5%) = Rp 25.000<br/>' +
                '├── Influencer (3%) = Rp 30.000<br/>' +
                '├── Mitra = Rp 0<br/>' +
                '└── Sisa Amil = <strong>Rp 145.000</strong><br/><br/>' +
                'Dana Program = <strong>Rp 800.000</strong>' +
                '</div>' +

                '<h4 style="margin-top:16px;">Skenario 3: Campaign Mitra + Tanpa Referral</h4>' +
                '<p>Campaign dibuat oleh mitra (lembaga eksternal), donatur datang langsung.</p>' +
                '<div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin:8px 0; font-family: monospace; font-size:13px; line-height:1.6;">' +
                'Donasi: Rp 1.000.000 | X% (shodaqoh): 20%<br/><br/>' +
                'Bagian Amil = Rp 200.000<br/>' +
                '├── Platform Provider (2.5%) = Rp 25.000<br/>' +
                '├── Influencer = Rp 0<br/>' +
                '├── Mitra Shodaqoh (5%) = Rp 50.000<br/>' +
                '└── Sisa Amil = <strong>Rp 125.000</strong><br/><br/>' +
                'Dana Program = <strong>Rp 800.000</strong>' +
                '</div>' +

                '<h4 style="margin-top:16px;">Skenario 4: Campaign Mitra + Dengan Referral (Paling Kompleks)</h4>' +
                '<p>Campaign dibuat mitra, donatur datang via influencer.</p>' +
                '<div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin:8px 0; font-family: monospace; font-size:13px; line-height:1.6;">' +
                'Donasi: Rp 1.000.000 | X% (shodaqoh): 20%<br/><br/>' +
                'Bagian Amil = Rp 200.000<br/>' +
                '├── Platform Provider (2.5%) = Rp 25.000<br/>' +
                '├── Influencer (3%) = Rp 30.000<br/>' +
                '├── Mitra Shodaqoh (5%) = Rp 50.000<br/>' +
                '└── Sisa Amil = <strong>Rp 95.000</strong><br/><br/>' +
                'Dana Program = <strong>Rp 800.000</strong>' +
                '</div>' +

                '<h4 style="margin-top:16px;">Skenario 5: Zakat</h4>' +
                '<div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin:8px 0; font-family: monospace; font-size:13px; line-height:1.6;">' +
                'Zakat: Rp 5.000.000 | X% (zakat): 12.5%<br/><br/>' +
                'Bagian Amil = Rp 625.000<br/>' +
                '├── Platform Provider (2.5%) = Rp 125.000<br/>' +
                '├── Influencer (3%) = Rp 150.000 (jika via referral)<br/>' +
                '├── Mitra = Rp 0<br/>' +
                '└── Sisa Amil = <strong>Rp 350.000</strong><br/><br/>' +
                'Dana Zakat (mustahiq) = <strong>Rp 4.375.000</strong>' +
                '</div>',
        },
        {
            id: "settings",
            heading: "Pengaturan via Settings",
            bodyHtml:
                '<p>Semua persentase dikelola melalui <strong>Settings → Administrasi Amil</strong>:</p>' +
                '<table style="width:100%; border-collapse:collapse; margin:16px 0;">' +
                '<thead><tr style="background:#f3f4f6;"><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Label</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Keterangan</th></tr></thead>' +
                '<tbody>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Prosentase Amil Zakat (%)</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">Max 12.5% (batas syariat ⅛)</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Prosentase Amil Shodaqoh & Donasi (%)</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">Untuk campaign & shodaqoh</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Prosentase Platform Provider (%)</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">Fee platform teknologi</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Prosentase Influencer (%)</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">Komisi influencer (dari bagian amil)</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Prosentase Mitra Untuk Zakat (%)</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">Bagi hasil mitra untuk alur zakat</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Prosentase Mitra Untuk Shodaqoh (%)</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">Bagi hasil mitra untuk campaign/shodaqoh</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Administrasi Qurban Kambing (Rp)</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">Nominal tetap admin fee per ekor kambing</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Admin Qurban Sapi (Rp)</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">Nominal tetap admin fee per ekor sapi</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Prosentasi Biaya Admin Qurban Pemilik Aplikasi (%)</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">Porsi pemilik app dari admin fee qurban; sisa = mitra</td></tr>' +
                '</tbody></table>' +
                '<p>⚠️ <strong>Validasi penting:</strong> Pastikan total potongan (Platform Provider% + Influencer% + Mitra%) <strong>tidak melebihi</strong> persentase amil (X%). Jika melebihi, sistem akan menolak dan menampilkan error.</p>',
        },
        {
            id: "kapan-dihitung",
            heading: "Kapan Bagi Hasil Dihitung?",
            bodyHtml:
                '<p>Revenue sharing dihitung <strong>otomatis saat transaksi dikonfirmasi (paid)</strong>, bukan saat transaksi dibuat. Alurnya:</p>' +
                '<ol>' +
                '<li>Donatur melakukan pembayaran → transaksi berstatus <strong>pending</strong>.</li>' +
                '<li>Admin memverifikasi pembayaran → status menjadi <strong>paid</strong>.</li>' +
                '<li>Sistem mengecek pengecualian:<br/>' +
                '&emsp;• Jika campaign wakaf atau fidyah → <strong>SKIP</strong> (100% utuh).<br/>' +
                '&emsp;• Jika qurban dan admin fee = 0 → <strong>SKIP</strong>.</li>' +
                '<li>Sistem menentukan formula:<br/>' +
                '&emsp;• Qurban (admin fee > 0) → <strong>Formula B</strong> (owner app + mitra).<br/>' +
                '&emsp;• Campaign/Zakat → <strong>Formula A</strong> (cap X%).</li>' +
                '<li>Hitung potongan platform provider, influencer, mitra.</li>' +
                '<li>Simpan record bagi hasil ke tabel <code>revenue_shares</code>.</li>' +
                '<li>Update saldo masing-masing pihak (influencer, mitra).</li>' +
                '</ol>' +
                '<p>📌 Perubahan persentase di Settings <strong>hanya berlaku untuk transaksi baru</strong>. Transaksi lama tetap menggunakan persentase saat dihitung (tersimpan sebagai snapshot).</p>',
        },
        {
            id: "laporan",
            heading: "Laporan Bagi Hasil",
            bodyHtml:
                '<p>Admin dapat melihat laporan lengkap di <strong>Laporan → Bagi Hasil Amil</strong> (<code>/dashboard/reports/revenue-sharing</code>).</p>' +
                '<h4 style="margin-top:12px;">Summary Cards</h4>' +
                '<ul>' +
                '<li><strong>Total Donasi Masuk</strong> — Total donasi pada periode tersebut</li>' +
                '<li><strong>Total Bagian Amil (net)</strong> — Sisa amil setelah semua potongan</li>' +
                '<li><strong>Total Platform Provider Fee</strong> — Seluruh fee platform</li>' +
                '<li><strong>Total Komisi Influencer</strong> — Seluruh komisi influencer</li>' +
                '<li><strong>Total Bagi Hasil Mitra</strong> — Seluruh bagi hasil mitra</li>' +
                '<li><strong>Total Dana Program</strong> — Dana yang masuk ke program/mustahiq</li>' +
                '</ul>' +
                '<h4 style="margin-top:12px;">Tabel Detail</h4>' +
                '<p>Setiap record menampilkan: tanggal, nomor transaksi, produk, nominal donasi, persentase amil, platform provider, influencer, mitra, sisa amil, dan dana program.</p>' +
                '<p>Filter tersedia: tanggal (dari–sampai) dan tipe produk. Data diurutkan dari transaksi terbaru.</p>',
        },
        {
            id: "pencairan",
            heading: "Pencairan Revenue Share",
            bodyHtml:
                '<p>Setelah bagi hasil dihitung, dana masing-masing pihak bisa dicairkan melalui sistem <strong>Disbursements</strong>:</p>' +
                '<table style="width:100%; border-collapse:collapse; margin:12px 0;">' +
                '<thead><tr style="background:#f3f4f6;"><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Pihak</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Tipe Disbursement</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Kategori</th></tr></thead>' +
                '<tbody>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Mitra</td><td style="padding:8px; border:1px solid #e5e7eb;"><code>revenue_share</code></td><td style="padding:8px; border:1px solid #e5e7eb;"><code>revenue_share_mitra</code></td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Influencer</td><td style="padding:8px; border:1px solid #e5e7eb;"><code>revenue_share</code></td><td style="padding:8px; border:1px solid #e5e7eb;"><code>revenue_share_fundraiser</code></td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Platform Provider</td><td style="padding:8px; border:1px solid #e5e7eb;"><code>revenue_share</code></td><td style="padding:8px; border:1px solid #e5e7eb;"><code>revenue_share_developer</code></td></tr>' +
                '</tbody></table>' +
                '<p>Pencairan mengikuti alur standar: <strong>submitted → approved → paid</strong>. Sistem mencegah pencairan ganda melalui tabel alokasi <code>disbursement_revenue_share_items</code>.</p>',
        },
        {
            id: "edge-cases",
            heading: "Catatan Penting & Edge Cases",
            bodyHtml:
                '<ul>' +
                '<li>⚠️ <strong>Zakat max 12.5%</strong> — Batas syariat ⅛. Validasi dilakukan di frontend dan backend.</li>' +
                '<li>⚠️ <strong>Total potongan tidak boleh melebihi bagian amil</strong> — Jika Platform Provider% + Influencer% + Mitra% > X%, sistem menolak. Hubungi admin settings.</li>' +
                '<li>⚠️ <strong>Pembulatan ke bawah</strong> — Semua perhitungan menggunakan <code>Math.floor()</code>. Selisih pembulatan masuk ke saldo amil.</li>' +
                '<li>⚠️ <strong>Perubahan settings hanya untuk transaksi baru</strong> — Data historis tidak terpengaruh karena persentase disimpan sebagai snapshot.</li>' +
                '<li>⚠️ <strong>Transaksi refund/dibatalkan</strong> — Revenue share dibatalkan, saldo influencer dan mitra dikurangi otomatis.</li>' +
                '<li>⚠️ <strong>Idempotent per transaksi</strong> — Revenue share hanya dihitung sekali per transaction_id. Tidak akan terjadi duplikasi.</li>' +
                '<li>⚠️ <strong>Semua nominal integer</strong> — Perhitungan dalam satuan Rupiah penuh (bigint), bukan float/desimal.</li>' +
                '</ul>',
        },
    ],
};
