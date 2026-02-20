-- Add rejection_reason variable to payment rejected WhatsApp template
UPDATE settings
SET value = 'Yth. Ibu/Bapak {customer_name},

Mohon maaf, pembayaran untuk transaksi {order_number} tidak dapat kami verifikasi.

Alasan: {rejection_reason}

Detail:
• Program: {product_name}
• Jumlah: {total_amount}

Silahkan mengunggah ulang bukti pembayaran yang valid melalui:
{invoice_url}

Jika ada pertanyaan, hubungi kami di {store_whatsapp}

{store_name}'
WHERE key = 'wa_tpl_payment_rejected'
  AND category = 'whatsapp_template';
