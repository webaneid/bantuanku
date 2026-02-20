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
  (gen_random_uuid()::text, 'wa_tpl_register_welcome', 'Assalamualaikum {customer_name},

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
{store_whatsapp}', 'text', 'Selamat Datang', 'Dikirim ke user baru setelah registrasi', 'whatsapp_template', 11, false),

  (gen_random_uuid()::text, 'wa_tpl_register_verify_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Verifikasi WhatsApp', 'whatsapp_template', 12, false),
  (gen_random_uuid()::text, 'wa_tpl_register_verify', 'Halo {customer_name},

Kode verifikasi WhatsApp kamu: {verification_code}
Kode berlaku sampai {code_expires_at} WIB.

Jangan bagikan kode ini kepada siapapun.

{store_name}
{store_phone}', 'text', 'Verifikasi WhatsApp', 'Dikirim untuk verifikasi nomor WhatsApp', 'whatsapp_template', 13, false),

-- Kategori 2: Order
  (gen_random_uuid()::text, 'wa_tpl_order_campaign_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Donasi Campaign', 'whatsapp_template', 20, false),
  (gen_random_uuid()::text, 'wa_tpl_order_campaign', 'Yth. Ibu/Bapak {customer_name},

Terima kasih atas donasi Anda untuk program:
*{product_name}*

Detail Transaksi:
• No. Transaksi: {order_number}
• Jumlah Donasi: {total_amount}
• Kode Unik: {unique_code}
• *Total Transfer: {transfer_amount}*
• Tanggal: {created_date}

{customer_message}

Silahkan lakukan pembayaran melalui halaman berikut:
👉 {invoice_url}

{store_name}
{store_whatsapp}', 'text', 'Donasi Campaign Diterima', 'Dikirim ke donatur saat membuat donasi campaign', 'whatsapp_template', 21, false),

  (gen_random_uuid()::text, 'wa_tpl_order_zakat_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Zakat', 'whatsapp_template', 22, false),
  (gen_random_uuid()::text, 'wa_tpl_order_zakat', 'Yth. Ibu/Bapak {customer_name},

Terima kasih telah menunaikan {zakat_type}.

Detail Transaksi:
• No. Transaksi: {order_number}
• Jenis Zakat: {zakat_type}
• Periode: {zakat_period} ({zakat_hijri_year} H)
• Jumlah Zakat: {total_amount}
• *Total Transfer: {transfer_amount}*

Silahkan lakukan pembayaran melalui halaman berikut:
👉 {invoice_url}

Semoga Allah SWT menerima zakat Anda.
{store_name}
{store_whatsapp}', 'text', 'Pembayaran Zakat Diterima', 'Dikirim ke donatur saat membuat pembayaran zakat', 'whatsapp_template', 23, false),

  (gen_random_uuid()::text, 'wa_tpl_order_qurban_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Qurban', 'whatsapp_template', 24, false),
  (gen_random_uuid()::text, 'wa_tpl_order_qurban', 'Yth. Ibu/Bapak {customer_name},

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

Silahkan lakukan pembayaran melalui halaman berikut:
👉 {invoice_url}

{store_name}
{store_whatsapp}', 'text', 'Pesanan Qurban Diterima', 'Dikirim ke donatur saat membuat pesanan qurban', 'whatsapp_template', 25, false),

-- Kategori 3: Status Pembayaran
  (gen_random_uuid()::text, 'wa_tpl_payment_uploaded_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Upload Bukti', 'whatsapp_template', 30, false),
  (gen_random_uuid()::text, 'wa_tpl_payment_uploaded', 'Yth. Ibu/Bapak {customer_name},

Bukti pembayaran Anda untuk transaksi {order_number} telah kami terima.

Detail:
• Program: {product_name}
• Jumlah Transfer: {paid_amount}
• Status: Sedang Diverifikasi

Tim kami akan memverifikasi pembayaran Anda dalam 1×24 jam kerja.

{store_name}
{store_whatsapp}', 'text', 'Bukti Pembayaran Diterima', 'Dikirim saat donatur upload bukti bayar', 'whatsapp_template', 31, false),

  (gen_random_uuid()::text, 'wa_tpl_payment_approved_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Approved', 'whatsapp_template', 32, false),
  (gen_random_uuid()::text, 'wa_tpl_payment_approved', 'Yth. Ibu/Bapak {customer_name},

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
{store_whatsapp}', 'text', 'Pembayaran Dikonfirmasi', 'Dikirim saat admin approve pembayaran', 'whatsapp_template', 33, false),

  (gen_random_uuid()::text, 'wa_tpl_payment_rejected_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Rejected', 'whatsapp_template', 34, false),
  (gen_random_uuid()::text, 'wa_tpl_payment_rejected', 'Yth. Ibu/Bapak {customer_name},

Mohon maaf, pembayaran untuk transaksi {order_number} tidak dapat kami verifikasi.

Detail:
• Program: {product_name}
• Jumlah: {total_amount}

Silahkan mengunggah ulang bukti pembayaran yang valid melalui:
{invoice_url}

Jika ada pertanyaan, hubungi kami di {store_whatsapp}

{store_name}', 'text', 'Pembayaran Ditolak', 'Dikirim saat admin reject pembayaran', 'whatsapp_template', 35, false),

  (gen_random_uuid()::text, 'wa_tpl_payment_reminder_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Reminder', 'whatsapp_template', 36, false),
  (gen_random_uuid()::text, 'wa_tpl_payment_reminder', 'Yth. Ibu/Bapak {customer_name},

Ini adalah pengingat bahwa transaksi Anda belum selesai dibayar.

Detail:
• No. Transaksi: {order_number}
• Program: {product_name}
• Total: {transfer_amount}
• Sudah Dibayar: {paid_amount}
• Sisa: {remaining_amount}

Silahkan segera lakukan pembayaran melalui halaman berikut:
👉 {invoice_url}

{store_name}
{store_whatsapp}', 'text', 'Pengingat Pembayaran', 'Dikirim sebagai pengingat pembayaran', 'whatsapp_template', 37, false),

  (gen_random_uuid()::text, 'wa_tpl_payment_expired_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Expired', 'whatsapp_template', 38, false),
  (gen_random_uuid()::text, 'wa_tpl_payment_expired', 'Yth. Ibu/Bapak {customer_name},

Transaksi {order_number} untuk program *{product_name}* telah kedaluwarsa karena melewati batas waktu pembayaran.

Jika Anda masih ingin berdonasi, silahkan membuat transaksi baru di:
{store_website}

{store_name}
{store_whatsapp}', 'text', 'Pembayaran Kedaluwarsa', 'Dikirim saat transaksi expired', 'whatsapp_template', 39, false),

-- Kategori 4: Tabungan Qurban
  (gen_random_uuid()::text, 'wa_tpl_savings_created_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Tabungan Dibuat', 'whatsapp_template', 40, false),
  (gen_random_uuid()::text, 'wa_tpl_savings_created', 'Yth. Ibu/Bapak {customer_name},

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
{store_whatsapp}', 'text', 'Tabungan Qurban Dibuat', 'Dikirim saat tabungan qurban dibuat', 'whatsapp_template', 41, false),

  (gen_random_uuid()::text, 'wa_tpl_savings_deposit_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Setoran', 'whatsapp_template', 42, false),
  (gen_random_uuid()::text, 'wa_tpl_savings_deposit', 'Yth. Ibu/Bapak {customer_name},

Setoran tabungan qurban Anda telah diterima! ✅

Detail:
• No. Tabungan: {savings_number}
• Setoran ke-{installment_paid} dari {installment_count}
• Jumlah Setoran: {paid_amount}
• Saldo Saat Ini: {savings_current}
• Sisa Target: {savings_remaining}
• Progress: {savings_progress}

{store_name}
{store_whatsapp}', 'text', 'Setoran Tabungan Diterima', 'Dikirim saat setoran tabungan dikonfirmasi', 'whatsapp_template', 43, false),

  (gen_random_uuid()::text, 'wa_tpl_savings_reminder_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Pengingat Cicilan', 'whatsapp_template', 44, false),
  (gen_random_uuid()::text, 'wa_tpl_savings_reminder', 'Yth. Ibu/Bapak {customer_name},

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
{store_whatsapp}', 'text', 'Pengingat Cicilan Qurban', 'Dikirim sebagai pengingat cicilan tabungan', 'whatsapp_template', 45, false),

  (gen_random_uuid()::text, 'wa_tpl_savings_completed_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Lunas', 'whatsapp_template', 46, false),
  (gen_random_uuid()::text, 'wa_tpl_savings_completed', 'Yth. Ibu/Bapak {customer_name},

Alhamdulillah, tabungan qurban Anda telah LUNAS! 🎉

Detail:
• No. Tabungan: {savings_number}
• Paket: {qurban_package}
• Total Terkumpul: {savings_current}

Tabungan Anda akan segera dikonversi menjadi pesanan qurban.

Jazakumullahu khairan.
{store_name}
{store_whatsapp}', 'text', 'Tabungan Qurban Lunas', 'Dikirim saat tabungan qurban mencapai target', 'whatsapp_template', 47, false),

  (gen_random_uuid()::text, 'wa_tpl_savings_converted_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Konversi', 'whatsapp_template', 48, false),
  (gen_random_uuid()::text, 'wa_tpl_savings_converted', 'Yth. Ibu/Bapak {customer_name},

Tabungan qurban {savings_number} telah berhasil dikonversi menjadi pesanan qurban.

Detail Pesanan:
• Paket: {qurban_package}
• Periode: {qurban_period}
• Total: {savings_current}

Kami akan menginformasikan perkembangan qurban Anda selanjutnya.

{store_name}
{store_whatsapp}', 'text', 'Tabungan Dikonversi', 'Dikirim saat tabungan dikonversi ke pesanan', 'whatsapp_template', 49, false),

-- Kategori 5: Laporan & Penyaluran
  (gen_random_uuid()::text, 'wa_tpl_report_published_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Laporan', 'whatsapp_template', 50, false),
  (gen_random_uuid()::text, 'wa_tpl_report_published', 'Yth. Ibu/Bapak {customer_name},

Ada kabar terbaru dari program *{product_name}* yang Anda dukung! 📋

Laporan: {report_title}
Tanggal: {report_date}

{report_description}

Lihat laporan lengkap:
{report_url}

Terima kasih atas dukungan Anda.
{store_name}
{store_whatsapp}', 'text', 'Laporan Kegiatan Dipublikasikan', 'Dikirim ke donatur saat laporan kegiatan dipublikasikan', 'whatsapp_template', 51, false),

  (gen_random_uuid()::text, 'wa_tpl_disbursement_created_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Penyaluran', 'whatsapp_template', 52, false),
  (gen_random_uuid()::text, 'wa_tpl_disbursement_created', 'Yth. Ibu/Bapak {customer_name},

Alhamdulillah, dana dari program *{campaign_name}* telah disalurkan! 🤲

Detail Penyaluran:
• Jumlah: {disbursement_amount}
• Tujuan: {disbursement_purpose}
• Penerima: {recipient_name}
• Tanggal: {current_date}

Donasi Anda telah sampai kepada yang membutuhkan. Jazakumullahu khairan.

{store_name}
{store_whatsapp}', 'text', 'Dana Disalurkan', 'Dikirim ke donatur saat dana campaign disalurkan', 'whatsapp_template', 53, false),

-- Kategori 6: Admin Internal
  (gen_random_uuid()::text, 'wa_tpl_admin_new_transaction_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Admin Transaksi', 'whatsapp_template', 60, false),
  (gen_random_uuid()::text, 'wa_tpl_admin_new_transaction', '📥 TRANSAKSI BARU

No: {order_number}
Jenis: {product_type}
Program: {product_name}
Donatur: {customer_name}
Jumlah: {transfer_amount}
Metode: {payment_method}

Tanggal: {created_date}', 'text', 'Transaksi Masuk (Admin)', 'Dikirim ke admin saat ada transaksi baru', 'whatsapp_template', 61, false),

  (gen_random_uuid()::text, 'wa_tpl_admin_proof_uploaded_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Admin Bukti', 'whatsapp_template', 62, false),
  (gen_random_uuid()::text, 'wa_tpl_admin_proof_uploaded', '💳 BUKTI BAYAR MASUK

No: {order_number}
Donatur: {customer_name}
Program: {product_name}
Jumlah: {paid_amount}

Segera verifikasi di dashboard admin.', 'text', 'Bukti Bayar Masuk (Admin)', 'Dikirim ke admin finance saat ada bukti bayar', 'whatsapp_template', 63, false),

  (gen_random_uuid()::text, 'wa_tpl_admin_disbursement_request_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Admin Pencairan', 'whatsapp_template', 64, false),
  (gen_random_uuid()::text, 'wa_tpl_admin_disbursement_request', '📤 PERMINTAAN PENCAIRAN

No: {disbursement_number}
Jenis: {disbursement_type}
Program: {campaign_name}
Jumlah: {disbursement_amount}
Penerima: {recipient_name}
Tujuan: {disbursement_purpose}

Silahkan review dan approve di dashboard admin.', 'text', 'Permintaan Pencairan (Admin)', 'Dikirim ke admin saat ada permintaan pencairan', 'whatsapp_template', 65, false)
ON CONFLICT (key) DO NOTHING;
