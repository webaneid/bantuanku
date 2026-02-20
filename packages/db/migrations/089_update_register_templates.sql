-- Update template: Selamat Datang (Registrasi)
UPDATE settings SET value = 'Assalamualaikum {customer_name},

Salam dari {store_name}, selamat datang di Aplikasi Bantuanku!
Terima kasih telah mendaftar sebagai donatur.

Akun Anda:
- Nama: {customer_name}
- Email: {customer_email}
- WhatsApp: {customer_phone}

Melalui Bantuanku, Anda dapat berdonasi, menunaikan zakat, dan berqurban dengan mudah.

Kunjungi: {store_website}

Jazakumullahu khairan,
{store_name}
{store_website}'
WHERE key = 'wa_tpl_register_welcome';

-- Update template: Verifikasi WhatsApp
UPDATE settings SET value = 'Kode verifikasi Bantuanku Anda: {verification_code}

Berlaku sampai {code_expires_at} WIB.
Jangan bagikan kode ini kepada siapapun.

{store_name}'
WHERE key = 'wa_tpl_register_verify';
