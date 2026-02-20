-- Remove bank account info from WA templates
-- All payments should go through invoice URL on the website

UPDATE settings SET value = 'Yth. Ibu/Bapak {customer_name},

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
{store_whatsapp}'
WHERE key = 'wa_tpl_order_campaign';

UPDATE settings SET value = 'Yth. Ibu/Bapak {customer_name},

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
{store_whatsapp}'
WHERE key = 'wa_tpl_order_zakat';

UPDATE settings SET value = 'Yth. Ibu/Bapak {customer_name},

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
{store_whatsapp}'
WHERE key = 'wa_tpl_order_qurban';

UPDATE settings SET value = 'Yth. Ibu/Bapak {customer_name},

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
{store_whatsapp}'
WHERE key = 'wa_tpl_payment_reminder';
