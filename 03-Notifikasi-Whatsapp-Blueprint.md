# Blueprint: Sistem WhatsApp — Bantuanku Platform
## Notifikasi + Bot AI Donasi

## Tujuan
Membangun sistem WhatsApp komprehensif dengan 2 kapabilitas utama:

1. **Notifikasi Otomatis** — Seluruh siklus hidup donatur: pendaftaran, transaksi, tagihan, status pembayaran, laporan kegiatan, hingga penyaluran dana. Template pesan **editable** oleh admin.
2. **Bot AI Donasi** — Donatur bisa berdonasi, cek status, dan tanya info program langsung via WhatsApp menggunakan AI (Gemini/Claude).

---

## Pilihan Provider WhatsApp

### Dipilih: GOWA (aldinokemal/go-whatsapp-web-multidevice)

| Aspek | Detail |
|---|---|
| **Provider** | GOWA — REST API server di atas go-whatsapp-web (aldinokemal) |
| **Status** | Unofficial (WhatsApp Web protocol), ada risiko ban |
| **Biaya** | **GRATIS** — self-hosted, tidak ada biaya per pesan |
| **Kirim notifikasi** | Ya, langsung via REST API (tanpa approval template) |
| **Terima pesan + chatbot** | Ya, via webhook |
| **Integrasi** | REST API standar, deploy sebagai Docker container |
| **GitHub** | `github.com/aldinokemal/go-whatsapp-web-multidevice` |

### Cara Kerja GOWA
```
1. Deploy GOWA server (Go binary / Docker)
2. Scan QR code dari browser untuk login WhatsApp Web
3. GOWA expose REST API: POST /send/message, POST /send/image, dll
4. GOWA terima pesan masuk → forward ke webhook URL kita
5. Bantuanku API proses → kirim balasan via GOWA REST API
```

### Alternatif (Upgrade Path Masa Depan)

| Provider | Status | Catatan |
|---|---|---|
| WhatsApp Cloud API (Meta) | Resmi, no ban risk | Upgrade jika volume besar / butuh reliability. Biaya: Rp 357/utility template |
| BSP (Qontak/Wati) | Resmi | Platform fee Rp 400K+/bulan |
| OpenClaw (SumoPod) | Unofficial (Baileys) | Alternatif GOWA, tapi Node.js based |

### Keputusan
- **Saat ini**: GOWA (aldinokemal) — gratis, self-hosted, cukup untuk skala awal
- **Upgrade nanti**: Migrasi ke WhatsApp Cloud API jika volume besar atau butuh reliability tinggi
- **Mitigasi risiko ban**: Gunakan nomor WA khusus (bukan nomor pribadi), jangan spam, delay antar pesan

---

## Arsitektur Sistem

### Arsitektur Keseluruhan
```
┌──────────────────────────────────────────────────────────────────┐
│                    BANTUANKU PLATFORM                             │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│  │  Hono API    │    │  WhatsApp    │    │  AI Service  │        │
│  │  (existing)  │◄──►│  Service     │◄──►│  (Gemini/    │        │
│  │              │    │              │    │   Claude)    │        │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┘        │
│         │                   │                                     │
│         │            ┌──────┴───────┐                             │
│         │            │  GOWA        │  ← REST API server         │
│         │            │  (aldinokemal)│  ← Docker / binary        │
│         │            │  port: 3000  │  ← WhatsApp Web protocol   │
│         │            └──────┬───────┘                             │
└─────────┼───────────────────┼────────────────────────────────────┘
          │                   │
          ▼                   ▼
    ┌──────────┐       ┌──────────┐
    │ Database │       │ WhatsApp │
    │ (PG)     │       │ Donatur  │
    └──────────┘       └──────────┘
```

### Komponen

#### Bagian A: Notifikasi (One-Way)
1. **WhatsApp Provider** — GOWA REST API (self-hosted)
2. **Settings (`whatsapp` category)** — Konfigurasi API + toggle per-template
3. **Template Storage (`settings` table)** — Masing-masing template disimpan sebagai key di tabel `settings` dengan category `whatsapp_template`
4. **WhatsApp Service (`whatsapp.ts`)** — Service class untuk render template + kirim pesan
5. **Trigger Points** — Hook di endpoint-endpoint existing

#### Bagian B: Bot AI Donasi (Two-Way)
6. **Webhook Receiver** — Endpoint menerima pesan masuk dari GOWA webhook
7. **AI Service (`whatsapp-ai.ts`)** — Orchestrator yang mengirim pesan ke AI model
8. **AI Model** — Gemini atau Claude API untuk memproses intent donatur
9. **Tool Functions** — Fungsi-fungsi yang bisa dipanggil AI (buat transaksi, cek status, dll)

### Flow Notifikasi (One-Way)
```
Trigger Point → WhatsApp Service → Load Template dari Settings → Replace Variables → Kirim via GOWA REST API
```

### Flow Bot AI (Two-Way)
```
Donatur kirim pesan WA → GOWA server terima → Webhook ke Hono API
  → AI Service proses pesan dengan context
  → AI panggil tool functions jika perlu (cek status, buat donasi, dll)
  → AI generate balasan
  → Kirim balasan via GOWA REST API → Donatur terima di WA
```

---

## Sistem Variable

### A. Variable Global (tersedia di SEMUA template)

| Variable | Deskripsi | Sumber |
|---|---|---|
| `{store_name}` | Nama organisasi/lembaga | `settings.organization_name` |
| `{store_phone}` | Nomor telepon organisasi | `settings.organization_phone` |
| `{store_whatsapp}` | Nomor WhatsApp organisasi | `settings.organization_whatsapp` |
| `{store_email}` | Email organisasi | `settings.organization_email` |
| `{store_website}` | Website organisasi | `settings.organization_website` |
| `{store_address}` | Alamat organisasi | `settings.organization_address` |
| `{current_date}` | Tanggal saat pengiriman (DD MMMM YYYY) | Runtime |
| `{current_time}` | Waktu saat pengiriman (HH:mm WIB) | Runtime |

### B. Variable Donatur/Customer

| Variable | Deskripsi | Sumber |
|---|---|---|
| `{customer_name}` | Nama donatur | `transactions.donorName` / `donatur.name` |
| `{customer_email}` | Email donatur | `transactions.donorEmail` / `donatur.email` |
| `{customer_phone}` | Nomor HP donatur | `transactions.donorPhone` / `donatur.phone` |
| `{customer_whatsapp}` | Nomor WhatsApp donatur | `donatur.whatsappNumber` |

### C. Variable Transaksi

| Variable | Deskripsi | Sumber |
|---|---|---|
| `{order_number}` | Nomor transaksi | `transactions.transactionNumber` |
| `{product_type}` | Jenis produk (Campaign/Zakat/Qurban) | `transactions.productType` |
| `{product_name}` | Nama produk/campaign | `transactions.productName` |
| `{items}` | Detail item (nama × qty) | Computed dari productName + quantity |
| `{quantity}` | Jumlah unit | `transactions.quantity` |
| `{unit_price}` | Harga per unit | `transactions.unitPrice` (formatted) |
| `{subtotal}` | Subtotal | `transactions.subtotal` (formatted) |
| `{admin_fee}` | Biaya admin | `transactions.adminFee` (formatted) |
| `{unique_code}` | Kode unik transfer | `transactions.uniqueCode` |
| `{total_amount}` | Total pembayaran | `transactions.totalAmount` (formatted) |
| `{transfer_amount}` | Jumlah transfer (total + kode unik) | `totalAmount + uniqueCode` (formatted) |
| `{paid_amount}` | Jumlah sudah dibayar | `transactions.paidAmount` (formatted) |
| `{remaining_amount}` | Sisa pembayaran | `totalAmount - paidAmount` (formatted) |
| `{payment_status}` | Status pembayaran (Menunggu/Diproses/Lunas/Ditolak) | `transactions.paymentStatus` (translated) |
| `{payment_method}` | Metode pembayaran | Payment method name from settings |
| `{message}` | Pesan dari donatur | `transactions.message` |
| `{invoice_url}` | URL invoice/detail transaksi | Computed |
| `{created_date}` | Tanggal transaksi dibuat | `transactions.createdAt` (formatted) |
| `{paid_date}` | Tanggal pembayaran dikonfirmasi | `transactions.paidAt` (formatted) |

### D. Variable Pembayaran Bank

| Variable | Deskripsi | Sumber |
|---|---|---|
| `{bank_name}` | Nama bank tujuan | Payment method settings |
| `{bank_account}` | Nomor rekening tujuan | Payment method settings |
| `{bank_holder}` | Nama pemilik rekening | Payment method settings |

### E. Variable Zakat Spesifik

| Variable | Deskripsi | Sumber |
|---|---|---|
| `{zakat_type}` | Jenis zakat (Fitrah/Maal/Profesi/dll) | `typeSpecificData.zakat_type_name` |
| `{zakat_period}` | Periode zakat | `typeSpecificData.zakat_period_name` |
| `{zakat_year}` | Tahun zakat | `typeSpecificData.year` |
| `{zakat_hijri_year}` | Tahun Hijriah | `typeSpecificData.hijri_year` |
| `{zakat_calculation}` | Detail perhitungan zakat | `typeSpecificData` (formatted) |

### F. Variable Qurban Spesifik

| Variable | Deskripsi | Sumber |
|---|---|---|
| `{qurban_package}` | Nama paket qurban | `productName` |
| `{qurban_period}` | Periode qurban | `typeSpecificData.period_name` |
| `{qurban_type}` | Jenis hewan (Sapi/Kambing) | `typeSpecificData.animal_type` |
| `{qurban_names}` | Nama-nama peserta qurban | `typeSpecificData.participant_names` |

### G. Variable Tabungan Qurban

| Variable | Deskripsi | Sumber |
|---|---|---|
| `{savings_number}` | Nomor tabungan | `qurbanSavings.savingsNumber` |
| `{savings_target}` | Target tabungan | `qurbanSavings.targetAmount` (formatted) |
| `{savings_current}` | Saldo saat ini | `qurbanSavings.currentAmount` (formatted) |
| `{savings_remaining}` | Sisa kekurangan | `targetAmount - currentAmount` (formatted) |
| `{savings_progress}` | Persentase progress | Computed (XX%) |
| `{installment_amount}` | Nominal per cicilan | `qurbanSavings.installmentAmount` (formatted) |
| `{installment_frequency}` | Frekuensi (Mingguan/Bulanan) | `qurbanSavings.installmentFrequency` (translated) |
| `{installment_count}` | Total cicilan | `qurbanSavings.installmentCount` |
| `{installment_paid}` | Cicilan sudah bayar | Computed from transactions count |
| `{installment_remaining}` | Cicilan tersisa | `installmentCount - installmentPaid` |
| `{next_installment_date}` | Tanggal cicilan berikutnya | Computed |

### H. Variable Pencairan (Disbursement)

| Variable | Deskripsi | Sumber |
|---|---|---|
| `{disbursement_number}` | Nomor pencairan | `disbursements.disbursementNumber` |
| `{disbursement_type}` | Jenis pencairan | `disbursements.disbursementType` (translated) |
| `{disbursement_amount}` | Jumlah pencairan | `disbursements.amount` (formatted) |
| `{disbursement_status}` | Status pencairan | `disbursements.status` (translated) |
| `{disbursement_purpose}` | Tujuan pencairan | `disbursements.purpose` |
| `{recipient_name}` | Nama penerima | `disbursements.recipientName` |
| `{campaign_name}` | Nama campaign terkait | `disbursements.referenceName` |

### I. Variable Laporan Kegiatan

| Variable | Deskripsi | Sumber |
|---|---|---|
| `{report_title}` | Judul laporan | `activityReports.title` |
| `{report_date}` | Tanggal kegiatan | `activityReports.activityDate` (formatted) |
| `{report_description}` | Ringkasan laporan (plain text, max 200 char) | `activityReports.description` (stripped HTML) |
| `{report_url}` | URL laporan lengkap | Computed |

### J. Variable User/Auth

| Variable | Deskripsi | Sumber |
|---|---|---|
| `{user_name}` | Nama user | `users.name` |
| `{user_email}` | Email user | `users.email` |
| `{verification_code}` | Kode verifikasi | Runtime generated |
| `{code_expires_at}` | Waktu expired kode | Runtime computed |

---

## Daftar Template Notifikasi

### Kategori 1: Registrasi & Akun

| # | Key | Nama Template | Trigger Point | Penerima |
|---|---|---|---|---|
| 1 | `wa_tpl_register_welcome` | Selamat Datang | `POST /auth/register` | User baru |
| 2 | `wa_tpl_register_verify` | Verifikasi WhatsApp | `POST /auth/verify-whatsapp` (future) | User baru |

#### Template 1: Selamat Datang
```
Assalamualaikum {customer_name},

Selamat datang di {store_name}! 🎉

Akun Anda telah berhasil terdaftar dengan email: {customer_email}

Melalui {store_name}, Anda dapat:
• Berdonasi untuk berbagai program kebaikan
• Menunaikan zakat dengan mudah
• Berqurban dan menabung qurban
• Memantau seluruh riwayat donasi Anda

Kunjungi: {store_website}

Jazakumullahu khairan,
{store_name}
{store_whatsapp}
```

#### Template 2: Verifikasi WhatsApp
```
Halo {customer_name},

Kode verifikasi WhatsApp kamu: {verification_code}
Kode berlaku sampai {code_expires_at} WIB.

Jangan bagikan kode ini kepada siapapun.

{store_name}
{store_phone}
```

---

### Kategori 2: Transaksi Baru (Order Masuk)

| # | Key | Nama Template | Trigger Point | Penerima |
|---|---|---|---|---|
| 3 | `wa_tpl_order_campaign` | Donasi Campaign Diterima | `POST /transactions` (productType=campaign) | Donatur |
| 4 | `wa_tpl_order_zakat` | Pembayaran Zakat Diterima | `POST /transactions` (productType=zakat) | Donatur |
| 5 | `wa_tpl_order_qurban` | Pesanan Qurban Diterima | `POST /transactions` (productType=qurban) | Donatur |

#### Template 3: Donasi Campaign Diterima
```
Yth. Ibu/Bapak {customer_name},

Terima kasih atas donasi Anda untuk program:
*{product_name}*

Detail Transaksi:
• No. Transaksi: {order_number}
• Jumlah Donasi: {total_amount}
• Kode Unik: {unique_code}
• *Total Transfer: {transfer_amount}*
• Tanggal: {created_date}

Silahkan melakukan pembayaran melalui:
🏦 {bank_name}
💳 {bank_account} a.n {bank_holder}

{customer_message}

Lihat detail: {invoice_url}

{store_name}
{store_whatsapp}
```

#### Template 4: Pembayaran Zakat Diterima
```
Yth. Ibu/Bapak {customer_name},

Terima kasih telah menunaikan {zakat_type}.

Detail Transaksi:
• No. Transaksi: {order_number}
• Jenis Zakat: {zakat_type}
• Periode: {zakat_period} ({zakat_hijri_year} H)
• Jumlah Zakat: {total_amount}
• *Total Transfer: {transfer_amount}*

Silahkan melakukan pembayaran melalui:
🏦 {bank_name}
💳 {bank_account} a.n {bank_holder}

Lihat detail: {invoice_url}

Semoga Allah SWT menerima zakat Anda.
{store_name}
{store_whatsapp}
```

#### Template 5: Pesanan Qurban Diterima
```
Yth. Ibu/Bapak {customer_name},

Pesanan qurban Anda telah diterima.

Detail Pesanan:
• No. Transaksi: {order_number}
• Paket: {qurban_package}
• Periode: {qurban_period}
• Jumlah: {quantity} ekor
• Total Pembayaran: {total_amount}
• Biaya Admin: {admin_fee}
• *Total Transfer: {transfer_amount}*

Atas nama: {qurban_names}

Silahkan melakukan pembayaran melalui:
🏦 {bank_name}
💳 {bank_account} a.n {bank_holder}

Lihat detail: {invoice_url}

{store_name}
{store_whatsapp}
```

---

### Kategori 3: Status Pembayaran

| # | Key | Nama Template | Trigger Point | Penerima |
|---|---|---|---|---|
| 6 | `wa_tpl_payment_uploaded` | Bukti Pembayaran Diterima | `POST /transactions/:id/upload-proof` | Donatur |
| 7 | `wa_tpl_payment_approved` | Pembayaran Dikonfirmasi | `POST /transactions/:id/approve-payment` | Donatur |
| 8 | `wa_tpl_payment_rejected` | Pembayaran Ditolak | `POST /transactions/:id/reject-payment` | Donatur |
| 9 | `wa_tpl_payment_reminder` | Pengingat Pembayaran | Cron job / Manual trigger | Donatur |
| 10 | `wa_tpl_payment_expired` | Pembayaran Kedaluwarsa | Cron job / Status update | Donatur |

#### Template 6: Bukti Pembayaran Diterima
```
Yth. Ibu/Bapak {customer_name},

Bukti pembayaran Anda untuk transaksi {order_number} telah kami terima.

Detail:
• Program: {product_name}
• Jumlah Transfer: {paid_amount}
• Status: Sedang Diverifikasi

Tim kami akan memverifikasi pembayaran Anda dalam 1×24 jam kerja.

{store_name}
{store_whatsapp}
```

#### Template 7: Pembayaran Dikonfirmasi
```
Yth. Ibu/Bapak {customer_name},

Alhamdulillah, pembayaran Anda telah dikonfirmasi! ✅

Detail:
• No. Transaksi: {order_number}
• Program: {product_name}
• Jumlah: {total_amount}
• Tanggal Konfirmasi: {paid_date}

Donasi Anda akan segera disalurkan kepada yang membutuhkan.

Jazakumullahu khairan atas kepercayaan Anda.

Lihat riwayat: {invoice_url}

{store_name}
{store_whatsapp}
```

#### Template 8: Pembayaran Ditolak
```
Yth. Ibu/Bapak {customer_name},

Mohon maaf, pembayaran untuk transaksi {order_number} tidak dapat kami verifikasi.

Detail:
• Program: {product_name}
• Jumlah: {total_amount}

Silahkan mengunggah ulang bukti pembayaran yang valid melalui:
{invoice_url}

Jika ada pertanyaan, hubungi kami di {store_whatsapp}

{store_name}
```

#### Template 9: Pengingat Pembayaran
```
Yth. Ibu/Bapak {customer_name},

Ini adalah pengingat bahwa transaksi Anda belum selesai dibayar.

Detail:
• No. Transaksi: {order_number}
• Program: {product_name}
• Total: {transfer_amount}
• Sudah Dibayar: {paid_amount}
• Sisa: {remaining_amount}

Silahkan segera melakukan pembayaran melalui:
🏦 {bank_name}
💳 {bank_account} a.n {bank_holder}

Lihat detail: {invoice_url}

{store_name}
{store_whatsapp}
```

#### Template 10: Pembayaran Kedaluwarsa
```
Yth. Ibu/Bapak {customer_name},

Transaksi {order_number} untuk program *{product_name}* telah kedaluwarsa karena melewati batas waktu pembayaran.

Jika Anda masih ingin berdonasi, silahkan membuat transaksi baru di:
{store_website}

{store_name}
{store_whatsapp}
```

---

### Kategori 4: Tabungan Qurban

| # | Key | Nama Template | Trigger Point | Penerima |
|---|---|---|---|---|
| 11 | `wa_tpl_savings_created` | Tabungan Qurban Dibuat | POST qurban savings | Penabung |
| 12 | `wa_tpl_savings_deposit` | Setoran Tabungan Diterima | Setoran confirmed | Penabung |
| 13 | `wa_tpl_savings_reminder` | Pengingat Cicilan Qurban | Cron job | Penabung |
| 14 | `wa_tpl_savings_completed` | Tabungan Qurban Lunas | Target tercapai | Penabung |
| 15 | `wa_tpl_savings_converted` | Tabungan Dikonversi ke Pesanan | Admin convert | Penabung |

#### Template 11: Tabungan Qurban Dibuat
```
Yth. Ibu/Bapak {customer_name},

Tabungan qurban Anda telah berhasil dibuat! 🐄

Detail Tabungan:
• No. Tabungan: {savings_number}
• Paket: {qurban_package}
• Periode: {qurban_period}
• Target: {savings_target}
• Cicilan: {installment_amount} / {installment_frequency}
• Total Cicilan: {installment_count}x

Mulai menabung dari sekarang agar qurban Anda terpenuhi tepat waktu.

{store_name}
{store_whatsapp}
```

#### Template 12: Setoran Tabungan Diterima
```
Yth. Ibu/Bapak {customer_name},

Setoran tabungan qurban Anda telah diterima! ✅

Detail:
• No. Tabungan: {savings_number}
• Setoran ke-{installment_paid} dari {installment_count}
• Jumlah Setoran: {paid_amount}
• Saldo Saat Ini: {savings_current}
• Sisa Target: {savings_remaining}
• Progress: {savings_progress}

{store_name}
{store_whatsapp}
```

#### Template 13: Pengingat Cicilan Qurban
```
Yth. Ibu/Bapak {customer_name},

Ini adalah pengingat untuk cicilan tabungan qurban Anda.

Detail:
• No. Tabungan: {savings_number}
• Cicilan ke-{installment_paid} dari {installment_count}
• Nominal Cicilan: {installment_amount}
• Saldo Saat Ini: {savings_current}
• Sisa Target: {savings_remaining}

Silahkan lakukan setoran melalui akun Anda:
{store_website}/account/qurban-savings

{store_name}
{store_whatsapp}
```

#### Template 14: Tabungan Qurban Lunas
```
Yth. Ibu/Bapak {customer_name},

Alhamdulillah, tabungan qurban Anda telah LUNAS! 🎉

Detail:
• No. Tabungan: {savings_number}
• Paket: {qurban_package}
• Total Terkumpul: {savings_current}

Tabungan Anda akan segera dikonversi menjadi pesanan qurban.

Jazakumullahu khairan.
{store_name}
{store_whatsapp}
```

#### Template 15: Tabungan Dikonversi ke Pesanan
```
Yth. Ibu/Bapak {customer_name},

Tabungan qurban {savings_number} telah berhasil dikonversi menjadi pesanan qurban.

Detail Pesanan:
• Paket: {qurban_package}
• Periode: {qurban_period}
• Total: {savings_current}

Kami akan menginformasikan perkembangan qurban Anda selanjutnya.

{store_name}
{store_whatsapp}
```

---

### Kategori 5: Laporan & Penyaluran

| # | Key | Nama Template | Trigger Point | Penerima |
|---|---|---|---|---|
| 16 | `wa_tpl_report_published` | Laporan Kegiatan Dipublikasikan | Activity report published | Donatur campaign terkait |
| 17 | `wa_tpl_disbursement_created` | Dana Disalurkan | Disbursement status = paid | Donatur campaign terkait |

#### Template 16: Laporan Kegiatan Dipublikasikan
```
Yth. Ibu/Bapak {customer_name},

Ada kabar terbaru dari program *{product_name}* yang Anda dukung! 📋

Laporan: {report_title}
Tanggal: {report_date}

{report_description}

Lihat laporan lengkap:
{report_url}

Terima kasih atas dukungan Anda.
{store_name}
{store_whatsapp}
```

#### Template 17: Dana Disalurkan
```
Yth. Ibu/Bapak {customer_name},

Alhamdulillah, dana dari program *{campaign_name}* telah disalurkan! 🤲

Detail Penyaluran:
• Jumlah: {disbursement_amount}
• Tujuan: {disbursement_purpose}
• Penerima: {recipient_name}
• Tanggal: {current_date}

Donasi Anda telah sampai kepada yang membutuhkan. Jazakumullahu khairan.

{store_name}
{store_whatsapp}
```

---

### Kategori 6: Notifikasi Admin/Internal

| # | Key | Nama Template | Trigger Point | Penerima |
|---|---|---|---|---|
| 18 | `wa_tpl_admin_new_transaction` | Transaksi Masuk (Admin) | `POST /transactions` | Admin group |
| 19 | `wa_tpl_admin_proof_uploaded` | Bukti Bayar Masuk (Admin) | `POST /transactions/:id/upload-proof` | Admin finance |
| 20 | `wa_tpl_admin_disbursement_request` | Permintaan Pencairan (Admin) | Disbursement submitted | Admin approver |

#### Template 18: Transaksi Masuk (Admin)
```
📥 TRANSAKSI BARU

No: {order_number}
Jenis: {product_type}
Program: {product_name}
Donatur: {customer_name}
Jumlah: {transfer_amount}
Metode: {payment_method}

Tanggal: {created_date}
```

#### Template 19: Bukti Bayar Masuk (Admin)
```
💳 BUKTI BAYAR MASUK

No: {order_number}
Donatur: {customer_name}
Program: {product_name}
Jumlah: {paid_amount}

Segera verifikasi di dashboard admin.
```

#### Template 20: Permintaan Pencairan (Admin)
```
📤 PERMINTAAN PENCAIRAN

No: {disbursement_number}
Jenis: {disbursement_type}
Program: {campaign_name}
Jumlah: {disbursement_amount}
Penerima: {recipient_name}
Tujuan: {disbursement_purpose}

Silahkan review dan approve di dashboard admin.
```

---

## Penyimpanan Template

### Struktur Settings

Setiap template disimpan sebagai 1 row di tabel `settings`:

| Field | Value |
|---|---|
| `key` | `wa_tpl_order_campaign` (contoh) |
| `value` | Text template dengan variable `{...}` |
| `type` | `"text"` |
| `label` | "Donasi Campaign Diterima" |
| `description` | "Dikirim ke donatur saat membuat transaksi donasi campaign" |
| `category` | `"whatsapp_template"` |
| `is_public` | `false` |

### Konfigurasi API WhatsApp (GOWA)

| Key | Deskripsi | Contoh |
|---|---|---|
| `whatsapp_enabled` | Toggle global on/off | `"true"` |
| `whatsapp_api_url` | Base URL GOWA REST API (SumoPod / self-hosted) | `"https://gowa-xxx.sumopod.my.id"` |
| `whatsapp_username` | Username untuk Basic Auth GOWA | `"O7Yn7cyf"` |
| `whatsapp_password` | Password untuk Basic Auth GOWA | `"xxx..."` (encrypted) |
| `whatsapp_device_id` | Device ID dari GOWA (format: 628xxx:xx) | `"6285210626455:38"` |
| `whatsapp_sender_number` | Nomor WA yang login di GOWA | `"6285210626455"` |
| `whatsapp_admin_numbers` | Nomor admin penerima notifikasi (JSON array) | `["628xxx","628yyy"]` |
| `whatsapp_message_delay` | Delay antar pesan (ms) — anti-ban | `"2000"` |

Category: `"whatsapp"`

---

## Database Migration

### File: `packages/db/migrations/086_create_whatsapp_notification_settings.sql`

```sql
-- WhatsApp API Configuration (GOWA via SumoPod)
INSERT INTO settings (id, key, value, type, label, description, category, sort_order, is_public)
VALUES
  (gen_random_uuid()::text, 'whatsapp_enabled', 'false', 'boolean', 'WhatsApp Notifikasi', 'Aktifkan/nonaktifkan notifikasi WhatsApp', 'whatsapp', 1, false),
  (gen_random_uuid()::text, 'whatsapp_api_url', '', 'string', 'Gateway URL', 'Base URL GOWA REST API (SumoPod / self-hosted)', 'whatsapp', 2, false),
  (gen_random_uuid()::text, 'whatsapp_username', '', 'string', 'Username', 'Username Basic Auth GOWA', 'whatsapp', 3, false),
  (gen_random_uuid()::text, 'whatsapp_password', '', 'password', 'Password', 'Password Basic Auth GOWA (dienkripsi)', 'whatsapp', 4, false),
  (gen_random_uuid()::text, 'whatsapp_device_id', '', 'string', 'Device ID', 'Device ID dari GOWA/SumoPod (format: 628xxx:xx)', 'whatsapp', 5, false),
  (gen_random_uuid()::text, 'whatsapp_sender_number', '', 'string', 'Nomor Pengirim', 'Nomor WhatsApp yang login di GOWA', 'whatsapp', 6, false),
  (gen_random_uuid()::text, 'whatsapp_admin_numbers', '[]', 'json', 'Nomor Admin', 'Nomor WhatsApp admin penerima notifikasi internal (JSON array)', 'whatsapp', 7, false),
  (gen_random_uuid()::text, 'whatsapp_message_delay', '2000', 'number', 'Delay Pesan (ms)', 'Delay antar pengiriman pesan dalam milidetik (anti-ban)', 'whatsapp', 8, false),
  (gen_random_uuid()::text, 'whatsapp_webhook_secret', '', 'string', 'Webhook Secret', 'Secret untuk validasi webhook dari GOWA (sama dengan WHATSAPP_WEBHOOK_SECRET di SumoPod)', 'whatsapp', 9, false)
ON CONFLICT (key) DO NOTHING;

-- WhatsApp Templates (20 templates)
-- Setiap template punya enabled toggle + content

-- Kategori 1: Registrasi
INSERT INTO settings (id, key, value, type, label, description, category, sort_order, is_public)
VALUES
  (gen_random_uuid()::text, 'wa_tpl_register_welcome_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Selamat Datang', 'whatsapp_template', 10, false),
  (gen_random_uuid()::text, 'wa_tpl_register_welcome', '<DEFAULT_TEXT>', 'text', 'Selamat Datang', 'Dikirim ke user baru setelah registrasi', 'whatsapp_template', 11, false),

  (gen_random_uuid()::text, 'wa_tpl_register_verify_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Verifikasi WhatsApp', 'whatsapp_template', 12, false),
  (gen_random_uuid()::text, 'wa_tpl_register_verify', '<DEFAULT_TEXT>', 'text', 'Verifikasi WhatsApp', 'Dikirim untuk verifikasi nomor WhatsApp', 'whatsapp_template', 13, false),

-- Kategori 2: Order
  (gen_random_uuid()::text, 'wa_tpl_order_campaign_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Donasi Campaign', 'whatsapp_template', 20, false),
  (gen_random_uuid()::text, 'wa_tpl_order_campaign', '<DEFAULT_TEXT>', 'text', 'Donasi Campaign Diterima', 'Dikirim ke donatur saat membuat donasi campaign', 'whatsapp_template', 21, false),

  (gen_random_uuid()::text, 'wa_tpl_order_zakat_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Zakat', 'whatsapp_template', 22, false),
  (gen_random_uuid()::text, 'wa_tpl_order_zakat', '<DEFAULT_TEXT>', 'text', 'Pembayaran Zakat Diterima', 'Dikirim ke donatur saat membuat pembayaran zakat', 'whatsapp_template', 23, false),

  (gen_random_uuid()::text, 'wa_tpl_order_qurban_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Qurban', 'whatsapp_template', 24, false),
  (gen_random_uuid()::text, 'wa_tpl_order_qurban', '<DEFAULT_TEXT>', 'text', 'Pesanan Qurban Diterima', 'Dikirim ke donatur saat membuat pesanan qurban', 'whatsapp_template', 25, false),

-- Kategori 3: Status Pembayaran
  (gen_random_uuid()::text, 'wa_tpl_payment_uploaded_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Upload Bukti', 'whatsapp_template', 30, false),
  (gen_random_uuid()::text, 'wa_tpl_payment_uploaded', '<DEFAULT_TEXT>', 'text', 'Bukti Pembayaran Diterima', 'Dikirim saat donatur upload bukti bayar', 'whatsapp_template', 31, false),

  (gen_random_uuid()::text, 'wa_tpl_payment_approved_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Approved', 'whatsapp_template', 32, false),
  (gen_random_uuid()::text, 'wa_tpl_payment_approved', '<DEFAULT_TEXT>', 'text', 'Pembayaran Dikonfirmasi', 'Dikirim saat admin approve pembayaran', 'whatsapp_template', 33, false),

  (gen_random_uuid()::text, 'wa_tpl_payment_rejected_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Rejected', 'whatsapp_template', 34, false),
  (gen_random_uuid()::text, 'wa_tpl_payment_rejected', '<DEFAULT_TEXT>', 'text', 'Pembayaran Ditolak', 'Dikirim saat admin reject pembayaran', 'whatsapp_template', 35, false),

  (gen_random_uuid()::text, 'wa_tpl_payment_reminder_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Reminder', 'whatsapp_template', 36, false),
  (gen_random_uuid()::text, 'wa_tpl_payment_reminder', '<DEFAULT_TEXT>', 'text', 'Pengingat Pembayaran', 'Dikirim sebagai pengingat pembayaran', 'whatsapp_template', 37, false),

  (gen_random_uuid()::text, 'wa_tpl_payment_expired_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Expired', 'whatsapp_template', 38, false),
  (gen_random_uuid()::text, 'wa_tpl_payment_expired', '<DEFAULT_TEXT>', 'text', 'Pembayaran Kedaluwarsa', 'Dikirim saat transaksi expired', 'whatsapp_template', 39, false),

-- Kategori 4: Tabungan Qurban
  (gen_random_uuid()::text, 'wa_tpl_savings_created_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Tabungan Dibuat', 'whatsapp_template', 40, false),
  (gen_random_uuid()::text, 'wa_tpl_savings_created', '<DEFAULT_TEXT>', 'text', 'Tabungan Qurban Dibuat', 'Dikirim saat tabungan qurban dibuat', 'whatsapp_template', 41, false),

  (gen_random_uuid()::text, 'wa_tpl_savings_deposit_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Setoran', 'whatsapp_template', 42, false),
  (gen_random_uuid()::text, 'wa_tpl_savings_deposit', '<DEFAULT_TEXT>', 'text', 'Setoran Tabungan Diterima', 'Dikirim saat setoran tabungan dikonfirmasi', 'whatsapp_template', 43, false),

  (gen_random_uuid()::text, 'wa_tpl_savings_reminder_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Pengingat Cicilan', 'whatsapp_template', 44, false),
  (gen_random_uuid()::text, 'wa_tpl_savings_reminder', '<DEFAULT_TEXT>', 'text', 'Pengingat Cicilan Qurban', 'Dikirim sebagai pengingat cicilan tabungan', 'whatsapp_template', 45, false),

  (gen_random_uuid()::text, 'wa_tpl_savings_completed_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Lunas', 'whatsapp_template', 46, false),
  (gen_random_uuid()::text, 'wa_tpl_savings_completed', '<DEFAULT_TEXT>', 'text', 'Tabungan Qurban Lunas', 'Dikirim saat tabungan qurban mencapai target', 'whatsapp_template', 47, false),

  (gen_random_uuid()::text, 'wa_tpl_savings_converted_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Konversi', 'whatsapp_template', 48, false),
  (gen_random_uuid()::text, 'wa_tpl_savings_converted', '<DEFAULT_TEXT>', 'text', 'Tabungan Dikonversi', 'Dikirim saat tabungan dikonversi ke pesanan', 'whatsapp_template', 49, false),

-- Kategori 5: Laporan & Penyaluran
  (gen_random_uuid()::text, 'wa_tpl_report_published_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Laporan', 'whatsapp_template', 50, false),
  (gen_random_uuid()::text, 'wa_tpl_report_published', '<DEFAULT_TEXT>', 'text', 'Laporan Kegiatan Dipublikasikan', 'Dikirim ke donatur saat laporan kegiatan dipublikasikan', 'whatsapp_template', 51, false),

  (gen_random_uuid()::text, 'wa_tpl_disbursement_created_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Penyaluran', 'whatsapp_template', 52, false),
  (gen_random_uuid()::text, 'wa_tpl_disbursement_created', '<DEFAULT_TEXT>', 'text', 'Dana Disalurkan', 'Dikirim ke donatur saat dana campaign disalurkan', 'whatsapp_template', 53, false),

-- Kategori 6: Admin Internal
  (gen_random_uuid()::text, 'wa_tpl_admin_new_transaction_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Admin Transaksi', 'whatsapp_template', 60, false),
  (gen_random_uuid()::text, 'wa_tpl_admin_new_transaction', '<DEFAULT_TEXT>', 'text', 'Transaksi Masuk (Admin)', 'Dikirim ke admin saat ada transaksi baru', 'whatsapp_template', 61, false),

  (gen_random_uuid()::text, 'wa_tpl_admin_proof_uploaded_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Admin Bukti', 'whatsapp_template', 62, false),
  (gen_random_uuid()::text, 'wa_tpl_admin_proof_uploaded', '<DEFAULT_TEXT>', 'text', 'Bukti Bayar Masuk (Admin)', 'Dikirim ke admin finance saat ada bukti bayar', 'whatsapp_template', 63, false),

  (gen_random_uuid()::text, 'wa_tpl_admin_disbursement_request_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Admin Pencairan', 'whatsapp_template', 64, false),
  (gen_random_uuid()::text, 'wa_tpl_admin_disbursement_request', '<DEFAULT_TEXT>', 'text', 'Permintaan Pencairan (Admin)', 'Dikirim ke admin saat ada permintaan pencairan', 'whatsapp_template', 65, false)
ON CONFLICT (key) DO NOTHING;
```

> **Note**: `<DEFAULT_TEXT>` akan diisi dengan default text dari template di atas.

---

## Service: WhatsApp Notification

### File: `apps/api/src/services/whatsapp.ts`

```typescript
interface WhatsAppConfig {
  enabled: boolean;
  apiUrl: string;       // GOWA server URL (SumoPod / self-hosted)
  username: string;     // Basic Auth username
  password: string;     // Basic Auth password
  deviceId: string;     // Device ID (format: 628xxx:xx)
  senderNumber: string;
  adminNumbers: string[];
  messageDelay: number; // ms, anti-ban
}

interface SendParams {
  phone: string;
  templateKey: string;  // e.g. "wa_tpl_order_campaign"
  variables: Record<string, string>;
}

class WhatsAppService {
  constructor(private db: Database) {}

  // Load config dari settings category "whatsapp"
  async getConfig(): Promise<WhatsAppConfig>

  // Load template dari settings by key, return null jika disabled
  async getTemplate(key: string): Promise<string | null>

  // Load variable global dari settings category "organization"
  async getGlobalVariables(): Promise<Record<string, string>>

  // Render template: replace semua {variable} dengan value
  renderTemplate(template: string, variables: Record<string, string>): string

  // Format currency: 50000 → "Rp 50.000"
  formatCurrency(amount: number): string

  // Format date: Date → "17 Februari 2026"
  formatDate(date: Date): string

  // Send message via WhatsApp API provider
  async sendMessage(phone: string, message: string): Promise<boolean>

  // Main method: load template → render → send
  async send(params: SendParams): Promise<boolean>

  // Bulk send (untuk notifikasi ke banyak donatur)
  async sendBulk(recipients: Array<{ phone: string; variables: Record<string, string> }>, templateKey: string): Promise<void>

  // Send to admin numbers
  async sendToAdmins(templateKey: string, variables: Record<string, string>): Promise<void>
}
```

---

## Trigger Points

### Dimana WhatsApp Service dipanggil:

| File | Endpoint | Template Key | Keterangan |
|---|---|---|---|
| `routes/auth.ts` | `POST /auth/register` | `wa_tpl_register_welcome` | Setelah user berhasil register |
| `routes/transactions.ts` | `POST /transactions` | `wa_tpl_order_campaign` / `wa_tpl_order_zakat` / `wa_tpl_order_qurban` | Berdasarkan `productType` |
| `routes/transactions.ts` | `POST /transactions` | `wa_tpl_admin_new_transaction` | Kirim ke admin numbers |
| `routes/transactions.ts` | `POST /:id/upload-proof` | `wa_tpl_payment_uploaded` | Setelah upload berhasil |
| `routes/transactions.ts` | `POST /:id/upload-proof` | `wa_tpl_admin_proof_uploaded` | Kirim ke admin numbers |
| `routes/transactions.ts` | `POST /:id/approve-payment` | `wa_tpl_payment_approved` | Setelah admin approve |
| `routes/transactions.ts` | `POST /:id/reject-payment` | `wa_tpl_payment_rejected` | Setelah admin reject |
| `routes/admin/qurban-savings.ts` | `POST /` | `wa_tpl_savings_created` | Setelah tabungan dibuat |
| `routes/admin/qurban-savings.ts` | Deposit confirmed | `wa_tpl_savings_deposit` | Setelah setoran confirmed |
| `routes/admin/qurban-savings.ts` | Convert to order | `wa_tpl_savings_converted` | Setelah konversi |
| `routes/admin/activity-reports.ts` | `POST /` (status=published) | `wa_tpl_report_published` | Bulk send ke donatur campaign |
| `routes/admin/disbursements.ts` | markAsPaid | `wa_tpl_disbursement_created` | Bulk send ke donatur campaign |
| `routes/admin/disbursements.ts` | submit | `wa_tpl_admin_disbursement_request` | Kirim ke admin numbers |

---

## Admin UI

### Menu di SettingsLayout

Tambahkan menu **"Notifikasi WhatsApp"** di paling bawah sidebar settings.

**File**: `apps/admin/src/components/SettingsLayout.tsx`

```typescript
// Tambah import
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

// Tambah di allMenuItems (paling bawah, setelah Front-end)
{
  label: "Notifikasi WhatsApp",
  icon: ChatBubbleLeftRightIcon,
  href: "/dashboard/settings/whatsapp",
  roles: ["super_admin"],
},
```

Posisi di sidebar settings:
```
Settings
├── General Settings
├── Administrasi Amil
├── Payments
├── Users
├── Front-end
└── Notifikasi WhatsApp    ← BARU (paling bawah)
```

### File: `apps/admin/src/app/dashboard/settings/whatsapp/page.tsx`

### Layout

```
Tab: Konfigurasi GOWA | Template Pesan | Bot AI

[Tab 1: Konfigurasi GOWA]
├── Toggle: WhatsApp Notifikasi (on/off)
├── Input: Gateway URL (SumoPod/self-hosted)
├── Input: Username
├── Input: Password (masked)
├── Input: Device ID (format: 628xxx:xx)
├── Input: Webhook Secret
├── Input: Nomor Pengirim
├── Input: Nomor Admin (multi-input, JSON array)
├── Input: Delay Pesan (ms, default: 2000)
├── Status: Koneksi GOWA (Connected/Disconnected) — via GET /app/devices
├── Button: Test Koneksi
└── Button: Test Kirim Pesan

[Tab 2: Template Pesan]
├── Accordion Group: Registrasi & Akun (2 template)
│   ├── Template: Selamat Datang [toggle] [edit]
│   └── Template: Verifikasi WhatsApp [toggle] [edit]
├── Accordion Group: Transaksi Baru (3 template)
│   ├── Template: Donasi Campaign Diterima [toggle] [edit]
│   ├── Template: Pembayaran Zakat Diterima [toggle] [edit]
│   └── Template: Pesanan Qurban Diterima [toggle] [edit]
├── Accordion Group: Status Pembayaran (5 template)
│   ├── Template: Bukti Pembayaran Diterima [toggle] [edit]
│   ├── Template: Pembayaran Dikonfirmasi [toggle] [edit]
│   ├── Template: Pembayaran Ditolak [toggle] [edit]
│   ├── Template: Pengingat Pembayaran [toggle] [edit]
│   └── Template: Pembayaran Kedaluwarsa [toggle] [edit]
├── Accordion Group: Tabungan Qurban (5 template)
│   ├── Template: Tabungan Qurban Dibuat [toggle] [edit]
│   ├── Template: Setoran Tabungan Diterima [toggle] [edit]
│   ├── Template: Pengingat Cicilan Qurban [toggle] [edit]
│   ├── Template: Tabungan Qurban Lunas [toggle] [edit]
│   └── Template: Tabungan Dikonversi [toggle] [edit]
├── Accordion Group: Laporan & Penyaluran (2 template)
│   ├── Template: Laporan Kegiatan Dipublikasikan [toggle] [edit]
│   └── Template: Dana Disalurkan [toggle] [edit]
└── Accordion Group: Notifikasi Admin (3 template)
    ├── Template: Transaksi Masuk (Admin) [toggle] [edit]
    ├── Template: Bukti Bayar Masuk (Admin) [toggle] [edit]
    └── Template: Permintaan Pencairan (Admin) [toggle] [edit]
```

Setiap template card berisi:
- **Toggle** on/off (simpan ke `{key}_enabled`)
- **Textarea** isi pesan (simpan ke `{key}`)
- **Chip** daftar variable yang tersedia untuk template tersebut (klik untuk insert)
- **Preview** hasil render dengan data contoh
- **Button** reset ke default

```
[Tab 3: Bot AI]
├── Toggle: Bot AI (on/off)
├── Select: AI Provider (Gemini / Claude)
├── Input: API Key (masked)
├── Input: Model ID (default: gemini-2.0-flash)
├── Textarea: System Prompt (editable, default dari blueprint)
└── Log viewer: Riwayat percakapan bot (read-only, tabel)
```

---

## BAGIAN B: Bot AI Donasi via WhatsApp

### Konsep

Donatur bisa berinteraksi dengan lembaga via WhatsApp secara natural. AI memahami intent dan menjalankan aksi yang sesuai.

### Contoh Percakapan

```
Donatur: Assalamualaikum, saya mau berdonasi untuk program pembangunan masjid
Bot: Waalaikumsalam, Kak Ahmad! 🤲

Kami menemukan program yang sesuai:
📌 *Pembangunan Masjid Al-Ikhlas*
🎯 Target: Rp 500.000.000
📊 Terkumpul: Rp 320.000.000 (64%)

Berapa nominal yang ingin Anda donasikan?

Donatur: 500 ribu
Bot: Baik, berikut ringkasan donasi Anda:

• Program: Pembangunan Masjid Al-Ikhlas
• Nominal: Rp 500.000
• Biaya Admin: Rp 0

*Total: Rp 500.000*

Pilih metode pembayaran:
1️⃣ Transfer Bank
2️⃣ QRIS
3️⃣ Payment Gateway (VA/E-Wallet)

Donatur: 3
Bot: Silakan lanjutkan pembayaran melalui link berikut:
🔗 https://flip.id/pwf/xxx

Link berlaku sampai 18 Feb 2026, 23:59 WIB.
Terima kasih, Kak Ahmad! 🤲
```

```
Donatur: Cek status donasi saya
Bot: Berikut riwayat transaksi terakhir Anda:

1. TRX-20260218-76315 — Donasi Campaign
   Program: Pembangunan Sekolah Mitra
   Rp 200.000 — ✅ Lunas

2. TRX-20260217-09816 — Zakat
   Rp 180.000 — ⏳ Menunggu Pembayaran

Mau saya bantu yang mana?
```

```
Donatur: Saya mau bayar zakat fitrah
→ Bot memanggil: get_zakat_programs({ calculatorType: "fitrah" })
→ Tool mengembalikan data program (clean text, bukan JSON)
Bot: Baik, kami punya 2 program zakat fitrah:

1. *Zakat Fitrah Untuk Daerah Terpencil*
2. *Zakat Fitrah Untuk Sesama*

Mau disalurkan ke program yang mana?

Donatur: Yang nomor 1
Bot: Baik, Zakat Fitrah Untuk Daerah Terpencil.
Zakat fitrah ini untuk berapa jiwa/orang? Anda bisa membayarkan tidak hanya untuk diri sendiri.

Donatur: 4 jiwa
→ Bot memanggil: calculate_zakat({ zakatTypeId: "...", params: { jumlah_jiwa: 4 } })
→ Nilai per jiwa diambil dari: zakatType.fitrahAmount → settings.zakat_fitrah_amount (Rp 50.000)
Bot: Berikut perhitungan zakat fitrah Anda:

4 jiwa × Rp 50.000 = Rp 200.000

Apakah nominal ini sudah sesuai?

Donatur: Ya
→ Bot memanggil: create_zakat_payment({ zakatTypeId: "...", amount: 200000, quantity: 4, donorName, donorPhone })
Bot: Transaksi zakat berhasil dibuat!

No. Transaksi: TRX-20260219-12345
Jenis Zakat: Zakat Fitrah Untuk Daerah Terpencil
Jumlah Jiwa: 4 orang × Rp 50.000
Nominal: Rp 200.000
Kode Unik: 780
Total Transfer: Rp 200.780
Status: Menunggu Pembayaran

Silakan lakukan pembayaran melalui link invoice berikut:
https://bantuanku.org/invoice/xxx

Atau pilih metode pembayaran: *Transfer Bank* atau *QRIS*?

Donatur: QRIS
→ Bot memanggil: send_qris({ transactionId: "...", phone: "628xxx" })
Bot: Baik, kami sudah mengirimkan gambar QRIS. Silakan scan untuk pembayaran.

Donatur: [kirim bukti transfer]
→ Bot memanggil: check_transaction_status({ phone: "628xxx" })
→ Bot memanggil: confirm_payment({ transactionId: "...", amount: 200780 })
Bot: Bukti pembayaran Anda telah kami terima dan sedang dalam proses verifikasi oleh admin.
```

### GOWA Setup

#### 1. Deploy GOWA Server

```bash
# Option A: SumoPod Managed Hosting (RECOMMENDED — sudah dipakai)
# Dashboard: https://sumopod.my.id
# GOWA sudah ter-deploy, tinggal konfigurasi:
#   - Gateway URL: https://gowa-xxx.cgk-moto.sumopod.my.id
#   - Username + Password: dari dashboard SumoPod
#   - Device ID: dari dashboard SumoPod (format: 628xxx:xx)

# Option B: Self-hosted Docker
docker run -d \
  --name gowa \
  -p 3000:3000 \
  --webhook="https://api.bantuanku.org/v1/whatsapp/webhook" \
  --webhook-secret="secret123" \
  --basic-auth="admin:password123" \
  aldinokemal/go-whatsapp-web-multidevice:latest

# Option C: Build from source
git clone https://github.com/aldinokemal/go-whatsapp-web-multidevice
cd go-whatsapp-web-multidevice
go build -o gowa
./gowa --webhook="https://api.bantuanku.org/v1/whatsapp/webhook" --basic-auth="admin:pass"
```

#### 2. Login WhatsApp Web
```
1. Buka browser GOWA dashboard (SumoPod atau http://localhost:3000)
2. Klik "Login" → QR code muncul
3. Buka WhatsApp di HP → Settings → Linked Devices → Link a Device
4. Scan QR code
5. Status berubah menjadi "Connected"
6. Catat Device ID (format: 628xxx:xx)
```

#### 3. GOWA REST API Endpoints (dari OpenAPI spec)

**Kirim Pesan:**
```
POST /send/message     → Kirim pesan teks
  Body: { "phone": "628xxx@s.whatsapp.net", "message": "text" }

POST /send/image       → Kirim gambar (multipart/form-data)
  Fields: phone, image (file) / image_url, caption

POST /send/file        → Kirim dokumen/file (multipart/form-data)
  Fields: phone, file (binary), caption

POST /send/video       → Kirim video
POST /send/contact     → Kirim kontak
POST /send/location    → Kirim lokasi
POST /send/link        → Kirim link + preview
```

**Device & User:**
```
GET  /app/devices      → List devices + status koneksi
GET  /user/info        → Info akun WA
GET  /user/check       → Cek apakah nomor terdaftar di WA
```

**Headers yang diperlukan:**
```
Authorization: Basic base64(username:password)
X-Device-Id: 628xxx:xx    ← wajib jika multi-device
Content-Type: application/json (untuk /send/message)
Content-Type: multipart/form-data (untuk /send/image, /send/file)
```

**Response format:**
```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "Message sent",
  "results": {
    "message_id": "3EB089B9D6ADD58153C561",
    "timestamp": "2026-02-18T10:30:00Z"
  }
}
```

#### 4. SumoPod Environment Variables

Environment variables yang sudah dikonfigurasi di SumoPod:

| Env Variable | Deskripsi | Contoh |
|---|---|---|
| `APP_BASIC_AUTH` | Credentials untuk akses GOWA API | `O7Yn7cyf:rP3XKI2TlGRbVEyRv0KWv0J9` |
| `WHATSAPP_WEBHOOK` | URL webhook untuk terima pesan masuk | `https://api.bantuanku.org/v1/whatsapp/webhook` |
| `WHATSAPP_WEBHOOK_SECRET` | Secret untuk validasi webhook | `secret123` |
| `APP_ACCOUNT_VALIDATION` | Validasi akun WA sebelum kirim | `false` |
| `WHATSAPP_GATEWAY_URL` | Internal URL GOWA (untuk reference) | `https://gowa-xxx.sumopod.my.id/send/message` |

> **Note**: `APP_BASIC_AUTH` di SumoPod = username:password yang dipakai di settings Bantuanku (`whatsapp_username` + `whatsapp_password`).

#### 5. Settings Bot AI di Database

| Key | Deskripsi | Contoh |
|---|---|---|
| `whatsapp_bot_enabled` | Toggle bot AI on/off | `"true"` |
| `whatsapp_bot_ai_provider` | AI provider (gemini/claude) | `"gemini"` |
| `whatsapp_bot_ai_api_key` | API key untuk AI provider | `"AIza..."` / `"sk-ant..."` |
| `whatsapp_bot_ai_model` | Model ID | `"gemini-2.0-flash"` / `"claude-sonnet-4-5-20250929"` |
| `whatsapp_bot_system_prompt` | System prompt untuk AI | `"Kamu adalah asisten..."` |

Category: `"whatsapp"`

### Webhook Endpoint

#### File: `apps/api/src/routes/whatsapp.ts`

```typescript
// POST /whatsapp/webhook — Terima pesan masuk dari GOWA
// Header: X-Webhook-Secret (dari WHATSAPP_WEBHOOK_SECRET di SumoPod)
// GOWA webhook payload format:
// {
//   "device_id": "628xxx:38",
//   "from": "628xxx@s.whatsapp.net",
//   "message": "Halo saya mau donasi",
//   "pushName": "Ahmad",
//   "messageId": "3EB089B9D6ADD58153C561",
//   "isGroup": false,
//   "timestamp": 1708300000
// }
whatsappRoute.post("/webhook", async (c) => {
  // Validasi webhook secret
  const webhookSecret = await getSettingValue(db, "whatsapp_webhook_secret");
  const headerSecret = c.req.header("X-Webhook-Secret") || c.req.query("secret");
  if (webhookSecret && headerSecret !== webhookSecret) {
    return c.text("Forbidden", 403);
  }

  const body = await c.req.json();

  // GOWA format: from = "628xxx@s.whatsapp.net"
  const from = body.from?.replace("@s.whatsapp.net", "") || "";
  const text = body.message;
  const messageId = body.messageId;
  const profileName = body.pushName || "";
  const isGroup = body.isGroup || false;

  // Abaikan pesan dari group
  if (isGroup) {
    return c.text("OK", 200);
  }

  // Abaikan pesan dari diri sendiri (nomor pengirim)
  const senderNumber = await getSettingValue(db, "whatsapp_sender_number");
  if (from === senderNumber) {
    return c.text("OK", 200);
  }

  if (text && from) {
    // Process via AI (async, jangan block webhook response)
    processIncomingMessage(db, {
      from,
      text,
      messageId,
      profileName,
    }).catch(err => console.error("Error processing WA message:", err));
  }

  // Always return 200 to acknowledge
  return c.text("OK", 200);
});
```

### AI Service

#### File: `apps/api/src/services/whatsapp-ai.ts`

```typescript
interface ConversationContext {
  phone: string;
  profileName: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  donaturId?: string;
  pendingAction?: {
    type: "donate" | "zakat" | "qurban";
    campaignId?: string;
    amount?: number;
    step: string;
  };
}

// Conversation context disimpan in-memory (Map) dengan TTL 30 menit
// Key: phone number, Value: ConversationContext
const conversations = new Map<string, ConversationContext>();

// Tools yang bisa dipanggil AI
const tools = [
  {
    name: "search_campaigns",
    description: "Cari program/campaign donasi yang tersedia",
    parameters: { query: "string?", category: "string?" }
  },
  {
    name: "get_campaign_detail",
    description: "Lihat detail campaign termasuk progress",
    parameters: { campaignId: "string" }
  },
  {
    name: "create_donation",
    description: "Buat transaksi donasi baru",
    parameters: { campaignId: "string", amount: "number", donorName: "string", donorPhone: "string" }
  },
  {
    name: "create_zakat_payment",
    description: "Buat transaksi pembayaran zakat. Untuk fitrah multi-jiwa, isi quantity dan amount = total.",
    parameters: { zakatTypeId: "string", amount: "number", donorName: "string", donorPhone: "string", quantity: "number?" }
  },
  {
    name: "check_transaction_status",
    description: "Cek status transaksi. Bisa cari by nomor HP ATAU nomor transaksi (TRX-...).",
    parameters: { phone: "string?", transactionNumber: "string?" }
  },
  {
    name: "confirm_payment",
    description: "Konfirmasi pembayaran dari bukti transfer. WAJIB dipanggil sebelum memberi respons verifikasi.",
    parameters: { transactionId: "string", amount: "number", paymentDate: "string?" }
  },
  {
    name: "get_bank_details",
    description: "Tampilkan rekening bank untuk transfer",
    parameters: { transactionId: "string" }
  },
  {
    name: "send_qris",
    description: "Kirim gambar QRIS ke donatur",
    parameters: { transactionId: "string", phone: "string" }
  },
  {
    name: "register_donatur",
    description: "Daftarkan donatur baru",
    parameters: { name: "string", email: "string", phone: "string" }
  },
  {
    name: "get_zakat_menu",
    description: "Tampilkan menu jenis zakat. HANYA panggil jika donatur bilang 'zakat' tanpa jenis spesifik.",
    parameters: {}
  },
  {
    name: "get_zakat_programs",
    description: "Tampilkan program zakat untuk jenis tertentu. WAJIB panggil jika donatur sudah sebut jenis (fitrah, maal, dll).",
    parameters: { calculatorType: "string (required)" }
  },
  {
    name: "calculate_zakat",
    description: "Hitung zakat berdasarkan jenis dan parameter. Nilai diambil dari DB settings.",
    parameters: { zakatTypeId: "string", params: "object" }
  },
  {
    name: "respond_to_user",
    description: "Kirim pesan teks biasa ke donatur",
    parameters: { message: "string" }
  }
];
```

### System Prompt untuk AI

```
Kamu adalah asisten donasi {store_name} di WhatsApp.

PERAN:
- Bantu donatur berdonasi, bayar zakat, dan cek status transaksi
- Jawab pertanyaan tentang program-program yang tersedia
- Bersikap ramah, islami, dan profesional
- Gunakan bahasa Indonesia yang sopan

ATURAN:
- JANGAN pernah mengarang data. Selalu gunakan tool untuk mengambil data real.
- WAJIB REGISTRASI DULU: Sebelum transaksi apapun, pastikan donatur SUDAH TERDAFTAR. Jika belum → FLOW REGISTRASI.
- Nominal minimum donasi/zakat: Rp 10.000
- Format mata uang selalu "Rp X.XXX"
- Jika tidak yakin intent user, tanyakan klarifikasi
- Jangan bahas topik di luar donasi/zakat/qurban
- JANGAN pernah mengirim JSON mentah atau data tool mentah ke donatur

FLOW REGISTRASI (WAJIB jika donatur belum terdaftar):
1. Sapa donatur, minta: Nama Lengkap dan Email
2. Nomor WhatsApp sudah diketahui dari INFO DONATUR
3. Panggil tool register_donatur
4. Baru lanjutkan ke flow donasi/zakat/qurban

FLOW DONASI (HANYA jika donatur sudah terdaftar):
1. Tanya/cari program yang diminati (tool search_campaigns)
2. WAJIB tanyakan nominal donasi
3. Tunggu nominal, baru panggil tool create_donation
4. Sampaikan detail: No. Transaksi, Program, Nominal, Kode Unik, Total Transfer, Status
   + Link invoice + opsi: Transfer Bank atau QRIS
5. Transfer Bank → get_bank_details | QRIS → send_qris

FLOW ZAKAT (HANYA jika donatur sudah terdaftar):
Ada 2 tool zakat yang BERBEDA — pilih yang TEPAT:
- get_zakat_menu → menu jenis zakat. HANYA jika donatur bilang "zakat" tanpa jenis.
- get_zakat_programs → program untuk jenis tertentu. Jika donatur SUDAH sebut jenis.

Contoh:
- "saya ingin zakat fitrah" → get_zakat_programs({ calculatorType: "fitrah" })
- "mau bayar zakat maal" → get_zakat_programs({ calculatorType: "maal" })
- "saya mau zakat" (tanpa jenis) → get_zakat_menu()

1. HANYA jika donatur bilang "zakat" TANPA jenis → get_zakat_menu()
2. Jika donatur SUDAH sebut jenis → get_zakat_programs({ calculatorType: "fitrah" })
   → 1 program → langsung ke langkah 3
   → >1 program → tampilkan daftar, tanya pilihan
3. Program dipilih:
   → KHUSUS FITRAH: Tanya "Untuk berapa jiwa/orang?" sebelum menghitung
   → Panggil calculate_zakat (semua nilai dari DB settings, tidak hardcode)
   → Atau terima nominal langsung jika donatur tidak mau kalkulator
4. Konfirmasi nominal → create_zakat_payment({ ..., quantity: JUMLAH_JIWA untuk fitrah })
5. Sampaikan detail + link invoice + opsi: Transfer Bank atau QRIS (PERSIS sama dengan FLOW DONASI langkah 4-5)

FLOW KONFIRMASI PEMBAYARAN (bukti transfer / "sudah bayar"):
ATURAN WAJIB: JANGAN PERNAH bilang "pembayaran diterima/sedang diverifikasi" TANPA memanggil tool confirm_payment terlebih dahulu.
1. Jika ada gambar → analisis, ekstrak: nominal, tanggal, bank pengirim
2. WAJIB panggil check_transaction_status untuk cari transaksi pending
3. Cocokkan nominal → panggil confirm_payment({ transactionId, amount, paymentDate })
4. HANYA SETELAH confirm_payment berhasil → barulah sampaikan pesan verifikasi
DILARANG KERAS merespons "sudah diterima/diverifikasi" tanpa memanggil confirm_payment.

FLOW CEK TRANSAKSI:
- check_transaction_status bisa cari by nomor HP ATAU nomor transaksi (TRX-...)
- Jika donatur kirim nomor transaksi → panggil check_transaction_status({ transactionNumber: "TRX-..." })
- Jika mau kirim ulang QRIS/bank → panggil send_qris atau get_bank_details

CATATAN TEKNIS ZAKAT:
- DB menyimpan calculator_type dengan prefix "zakat-" (misal "zakat-fitrah")
- Kode otomatis normalize: "fitrah" dan "zakat-fitrah" keduanya akan cocok
- Nilai kalkulator (fitrah_amount, nisab, persentase) diambil dari tabel settings
- Prioritas fitrah: zakatType.fitrahAmount → settings.zakat_fitrah_amount → 45000 (fallback)

INFO LEMBAGA:
- Nama: {store_name}
- Website: {store_website}
- WhatsApp: {store_whatsapp}
```

### GOWA Client: Kirim Pesan

```typescript
// apps/api/src/services/whatsapp-gowa.ts

interface GOWAConfig {
  apiUrl: string;       // e.g. "https://gowa-xxx.sumopod.my.id" atau "http://localhost:3000"
  username: string;     // Basic Auth username
  password: string;     // Basic Auth password
  deviceId: string;     // Device ID (format: 628xxx:xx)
  messageDelay: number; // delay antar pesan (ms), default 2000
}

class GOWAClient {
  constructor(private config: GOWAConfig) {}

  private get baseHeaders(): Record<string, string> {
    const credentials = btoa(`${this.config.username}:${this.config.password}`);
    return {
      Authorization: `Basic ${credentials}`,
      "X-Device-Id": this.config.deviceId,
    };
  }

  // Format nomor ke JID WhatsApp
  private formatPhone(phone: string): string {
    // Bersihkan ke format: 628xxx@s.whatsapp.net
    const clean = phone.replace(/^\+/, "").replace("@s.whatsapp.net", "").replace(/[^0-9]/g, "");
    return `${clean}@s.whatsapp.net`;
  }

  // Kirim pesan teks — POST /send/message (JSON)
  async sendText(to: string, text: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/send/message`, {
        method: "POST",
        headers: {
          ...this.baseHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: this.formatPhone(to),
          message: text,
        }),
      });

      const result = await response.json() as { code?: string };
      return result.code === "SUCCESS";
    } catch (err) {
      console.error("GOWA sendText error:", err);
      return false;
    }
  }

  // Kirim gambar + caption — POST /send/image (multipart/form-data)
  async sendImage(to: string, imageUrl: string, caption?: string): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append("phone", this.formatPhone(to));
      formData.append("image_url", imageUrl);
      if (caption) formData.append("caption", caption);

      const response = await fetch(`${this.config.apiUrl}/send/image`, {
        method: "POST",
        headers: this.baseHeaders, // tanpa Content-Type, browser set otomatis untuk FormData
        body: formData,
      });

      const result = await response.json() as { code?: string };
      return result.code === "SUCCESS";
    } catch (err) {
      console.error("GOWA sendImage error:", err);
      return false;
    }
  }

  // Kirim file/dokumen — POST /send/file (multipart/form-data)
  async sendFile(to: string, fileBuffer: Buffer, filename: string, caption?: string): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append("phone", this.formatPhone(to));
      formData.append("file", new Blob([fileBuffer]), filename);
      if (caption) formData.append("caption", caption);

      const response = await fetch(`${this.config.apiUrl}/send/file`, {
        method: "POST",
        headers: this.baseHeaders,
        body: formData,
      });

      const result = await response.json() as { code?: string };
      return result.code === "SUCCESS";
    } catch (err) {
      console.error("GOWA sendFile error:", err);
      return false;
    }
  }

  // Cek status koneksi WA — GET /app/devices
  async checkStatus(): Promise<{ connected: boolean; phoneNumber?: string }> {
    try {
      const response = await fetch(`${this.config.apiUrl}/app/devices`, {
        headers: this.baseHeaders,
      });

      const result = await response.json() as {
        code?: string;
        results?: { devices?: Array<{ device_id: string; is_connected: boolean; jid?: string }> };
      };

      if (result.code === "SUCCESS" && result.results?.devices) {
        const device = result.results.devices.find(d => d.device_id === this.config.deviceId);
        return {
          connected: device?.is_connected || false,
          phoneNumber: device?.jid?.replace("@s.whatsapp.net", ""),
        };
      }
      return { connected: false };
    } catch {
      return { connected: false };
    }
  }

  // Cek apakah nomor terdaftar di WhatsApp — GET /user/check
  async isRegistered(phone: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/user/check?phone=${this.formatPhone(phone)}`,
        { headers: this.baseHeaders }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  // Delay helper (anti-ban: jangan kirim terlalu cepat)
  async delay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.config.messageDelay));
  }
}
```

### Keuntungan GOWA vs Cloud API untuk Notifikasi

| Aspek | GOWA | Cloud API |
|---|---|---|
| **Biaya per pesan** | **Gratis** | Rp 357/utility template |
| **Approval template** | Tidak perlu | Perlu review Meta 1-2 hari |
| **Bisa kirim kapan saja** | Ya (no 24h window limit) | Ya (via approved template) |
| **Fleksibilitas template** | Bebas edit, langsung aktif | Harus submit ulang ke Meta |
| **Kirim media** | Ya (gambar, dokumen, video) | Ya |
| **Risiko** | Ban jika spam / terdeteksi bot | Aman (official) |

**Mitigasi risiko ban GOWA:**
- Delay minimum 2 detik antar pesan (`whatsapp_message_delay`)
- Jangan kirim lebih dari 50 pesan/jam ke nomor berbeda
- Gunakan nomor WA khusus (bukan pribadi)
- Jangan kirim pesan bulk marketing ke nomor yang belum pernah chat

---

## Fase Implementasi

### Fase 1: Fondasi — GOWA + Backend
| # | Task |
|---|---|
| 1 | Deploy GOWA server (Docker / binary), scan QR, pastikan connected |
| 2 | Migration: seed WhatsApp config (GOWA) + 20 template ke tabel `settings` |
| 3 | Buat `apps/api/src/services/whatsapp-gowa.ts` — GOWAClient class (sendText, sendImage, sendDocument) |
| 4 | Buat `apps/api/src/services/whatsapp.ts` — WhatsAppService class (template + variable rendering) |
| 5 | Buat helper: `formatCurrency`, `formatDate`, `renderTemplate`, `getGlobalVariables` |

### Fase 2: Trigger Points Donatur
| # | Task |
|---|---|
| 6 | Hook `POST /transactions` → kirim notifikasi order berdasarkan productType |
| 7 | Hook `POST /transactions/:id/upload-proof` → kirim notifikasi bukti diterima |
| 8 | Hook `POST /transactions/:id/approve-payment` → kirim notifikasi payment confirmed |
| 9 | Hook `POST /transactions/:id/reject-payment` → kirim notifikasi payment rejected |
| 10 | Hook `POST /auth/register` → kirim notifikasi welcome |

### Fase 3: Trigger Points Tabungan & Laporan
| # | Task |
|---|---|
| 11 | Hook qurban savings create → kirim notifikasi tabungan dibuat |
| 12 | Hook qurban savings deposit → kirim notifikasi setoran diterima |
| 13 | Hook qurban savings convert → kirim notifikasi konversi |
| 14 | Hook activity report publish → bulk send ke donatur campaign |
| 15 | Hook disbursement paid → bulk send ke donatur campaign |

### Fase 4: Trigger Points Admin
| # | Task |
|---|---|
| 16 | Hook `POST /transactions` → kirim ke admin numbers |
| 17 | Hook upload-proof → kirim ke admin numbers |
| 18 | Hook disbursement submit → kirim ke admin numbers |

### Fase 5: Admin UI — WhatsApp Settings
| # | Task |
|---|---|
| 19 | Buat halaman `settings/whatsapp/page.tsx` — Tab Konfigurasi GOWA |
| 20 | Implementasi: Input API URL, Basic Auth, Nomor Pengirim, Delay, Test Koneksi |
| 21 | Buat Tab Template Pesan dengan accordion groups |
| 22 | Implementasi variable chips (klik untuk insert ke textarea) |
| 23 | Implementasi preview template dengan data contoh |
| 24 | Implementasi test kirim pesan |
| 25 | Tambahkan menu "WhatsApp" di SettingsLayout sidebar |

### Fase 6: Pengingat (Cron/Manual)
| # | Task |
|---|---|
| 26 | Endpoint `POST /admin/whatsapp/send-reminder` — kirim pengingat pembayaran manual |
| 27 | Endpoint `POST /admin/whatsapp/send-savings-reminder` — kirim pengingat cicilan manual |
| 28 | (Opsional) Cron job untuk auto-reminder pending payment + cicilan |

### Fase 7: Bot AI — Webhook + Fondasi
| # | Task |
|---|---|
| 29 | Buat `apps/api/src/routes/whatsapp.ts` — Webhook endpoint (POST receive dari GOWA) |
| 30 | Register route di `index.ts`: `app.route("/v1/whatsapp", whatsappRoutes)` |
| 31 | Middleware: skip auth + skip content-type validation untuk `/whatsapp/webhook` |
| 32 | Buat `apps/api/src/services/whatsapp-ai.ts` — AI orchestrator + conversation context |
| 33 | Implementasi tool functions: `search_campaigns`, `get_campaign_detail`, `check_transaction_status` |
| 34 | Implementasi AI call: Gemini API / Claude API dengan tool use |
| 35 | Hook webhook POST → `processIncomingMessage()` → AI → reply via GOWA |
| 36 | Migration: seed bot settings (ai_provider, ai_api_key, ai_model, system_prompt, bot_enabled) |

### Fase 8: Bot AI — Transaksi
| # | Task |
|---|---|
| 37 | Implementasi tool: `create_donation` — buat transaksi donasi dari chat |
| 38 | Implementasi tool: `create_zakat_payment` — buat pembayaran zakat dari chat |
| 39 | Implementasi tool: `get_payment_link` — generate link pembayaran (Flip/bank/QRIS) |
| 40 | Implementasi tool: `get_zakat_menu`, `get_zakat_programs`, `calculate_zakat` — kalkulator zakat via chat |
| 41 | Conversation state management: multi-step flow (pilih program → nominal → bayar) |

### Fase 9: Bot AI — Admin UI
| # | Task |
|---|---|
| 42 | Tab baru di settings/whatsapp: "Bot AI" |
| 43 | Input: AI Provider (Gemini/Claude), API Key, Model |
| 44 | Textarea: System Prompt (editable) |
| 45 | Toggle: Bot AI on/off |
| 46 | Log viewer: riwayat percakapan bot (read-only) |

### Fase 10: (Future) Migrasi ke WhatsApp Cloud API
| # | Task |
|---|---|
| 47 | Buat `apps/api/src/services/whatsapp-cloud.ts` — WhatsAppCloudAPI adapter |
| 48 | Buat WhatsApp provider interface agar bisa swap GOWA ↔ Cloud API via settings |
| 49 | Submit Meta Business verification + message templates |
| 50 | Update webhook handler untuk mendukung format Cloud API (selain GOWA) |

---

## File Summary

| # | File | Aksi | Deskripsi |
|---|---|---|---|
| 1 | `packages/db/migrations/086_create_whatsapp_settings.sql` | CREATE | Seed settings GOWA config + 20 templates + bot AI settings |
| 2 | `apps/api/src/services/whatsapp-gowa.ts` | CREATE | GOWAClient class (sendText, sendImage, sendDocument, checkStatus) |
| 3 | `apps/api/src/services/whatsapp.ts` | CREATE | WhatsAppService class (template rendering + send via GOWAClient) |
| 4 | `apps/api/src/services/whatsapp-ai.ts` | CREATE | AI orchestrator + tool functions + conversation context |
| 5 | `apps/api/src/routes/whatsapp.ts` | CREATE | Webhook endpoint (receive messages dari GOWA) |
| 6 | `apps/api/src/routes/auth.ts` | EDIT | Hook register → welcome notification |
| 7 | `apps/api/src/routes/transactions.ts` | EDIT | Hook create/upload/approve/reject |
| 8 | `apps/api/src/routes/admin/qurban-savings.ts` | EDIT | Hook savings create/deposit/convert |
| 9 | `apps/api/src/routes/admin/activity-reports.ts` | EDIT | Hook publish → bulk send |
| 10 | `apps/api/src/routes/admin/disbursements.ts` | EDIT | Hook paid → bulk send |
| 11 | `apps/admin/src/app/dashboard/settings/whatsapp/page.tsx` | CREATE | Admin UI WhatsApp settings (3 tabs: GOWA Config, Templates, Bot AI) |
| 12 | `apps/admin/src/components/SettingsLayout.tsx` | EDIT | Tambah menu WhatsApp |
| 13 | `apps/api/src/index.ts` | EDIT | Register whatsapp route |
| 14 | `apps/api/src/middleware/security.ts` | EDIT | Skip auth untuk webhook |

---

## Variable Reference per Template

| Template Key | Variable yang Tersedia |
|---|---|
| `wa_tpl_register_welcome` | Global + Customer + User |
| `wa_tpl_register_verify` | Global + Customer + User + `{verification_code}`, `{code_expires_at}` |
| `wa_tpl_order_campaign` | Global + Customer + Transaksi + Bank |
| `wa_tpl_order_zakat` | Global + Customer + Transaksi + Bank + Zakat |
| `wa_tpl_order_qurban` | Global + Customer + Transaksi + Bank + Qurban |
| `wa_tpl_payment_uploaded` | Global + Customer + Transaksi |
| `wa_tpl_payment_approved` | Global + Customer + Transaksi |
| `wa_tpl_payment_rejected` | Global + Customer + Transaksi |
| `wa_tpl_payment_reminder` | Global + Customer + Transaksi + Bank |
| `wa_tpl_payment_expired` | Global + Customer + Transaksi |
| `wa_tpl_savings_created` | Global + Customer + Tabungan Qurban |
| `wa_tpl_savings_deposit` | Global + Customer + Tabungan Qurban |
| `wa_tpl_savings_reminder` | Global + Customer + Tabungan Qurban |
| `wa_tpl_savings_completed` | Global + Customer + Tabungan Qurban |
| `wa_tpl_savings_converted` | Global + Customer + Tabungan Qurban |
| `wa_tpl_report_published` | Global + Customer + Transaksi + Laporan |
| `wa_tpl_disbursement_created` | Global + Customer + Pencairan |
| `wa_tpl_admin_new_transaction` | Global + Customer + Transaksi |
| `wa_tpl_admin_proof_uploaded` | Global + Customer + Transaksi |
| `wa_tpl_admin_disbursement_request` | Global + Pencairan |

---

## Ringkasan Biaya (Estimasi)

### GOWA (Provider Saat Ini)
| Item | Biaya |
|---|---|
| Platform (self-hosted) | **Gratis** |
| Semua pesan (notifikasi + bot reply) | **Gratis** |
| Server GOWA (VPS / Docker) | Rp 0 (jalan di server existing) |

### AI API (untuk Bot AI saja)
| Provider | Model | Input/1M tok | Output/1M tok | Per 1000 chat (estimasi) |
|---|---|---|---|---|
| Google Gemini | gemini-2.0-flash | $0.10 | $0.40 | ~Rp 2.000 |
| **Anthropic Claude** | **claude-haiku-4-5** | **$0.80** | **$4.00** | **~Rp 19.000** |
| Anthropic Claude | claude-sonnet-4-5 | $3.00 | $15.00 | ~Rp 71.000 |

**Default**: Gemini 2.0 Flash (paling murah, cepat, mendukung tool use).
**Alternatif Claude**: Haiku 4.5 — lebih pintar dari Gemini untuk bahasa Indonesia, masih murah.

### Total Estimasi per Bulan (1000 transaksi)
| Item | Biaya |
|---|---|
| Notifikasi via GOWA (unlimited) | **Rp 0** |
| Bot AI (Gemini Flash, 2000 pesan) | Rp 10.000 |
| **Total** | **~Rp 10.000/bulan** |

> **Perbandingan**: Jika pakai WhatsApp Cloud API, notifikasi saja ~Rp 714.000/bulan. Dengan GOWA, hemat ~98%.

---

## Checklist Pre-Implementasi

- [x] Deploy GOWA server via SumoPod — **sudah aktif**
- [x] Login GOWA: scan QR code — **sudah connected**
- [x] Konfigurasi env vars SumoPod (APP_BASIC_AUTH, WHATSAPP_WEBHOOK, dll) — **sudah dikonfigurasi**
- [ ] Set webhook URL di SumoPod: `WHATSAPP_WEBHOOK=https://api.bantuanku.org/v1/whatsapp/webhook`
- [ ] Set webhook secret di SumoPod: `WHATSAPP_WEBHOOK_SECRET=<random_string>`
- [ ] Input konfigurasi GOWA di admin settings (Gateway URL, Username, Password, Device ID)
- [ ] Test kirim pesan via GOWA API:
  ```bash
  curl -X POST https://gowa-xxx.sumopod.my.id/send/message \
    -H "Authorization: Basic $(echo -n 'user:pass' | base64)" \
    -H "X-Device-Id: 628xxx:38" \
    -H "Content-Type: application/json" \
    -d '{"phone":"628xxx@s.whatsapp.net","message":"test dari Bantuanku"}'
  ```
- [ ] Dapatkan API key Gemini (untuk Bot AI): `console.cloud.google.com`
- [ ] (Optional) Jika mau Claude: dapatkan API key di `console.anthropic.com` → pilih model `claude-haiku-4-5`
