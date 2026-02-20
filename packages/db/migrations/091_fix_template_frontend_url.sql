-- Fix template: ganti {store_website}/path menjadi {frontend_url}/path
-- store_website = domain organisasi (contoh: bantuanku.org)
-- frontend_url = URL aplikasi frontend (contoh: https://app.bantuanku.org atau localhost:3002)

UPDATE settings
SET value = REPLACE(value, '{store_website}/account/qurban-savings', '{frontend_url}/account/qurban-savings')
WHERE key = 'wa_tpl_savings_reminder'
  AND value LIKE '%{store_website}/account/qurban-savings%';

-- Juga fix template expired yang pakai {store_website} sebagai link
-- Ganti ke {frontend_url} supaya link ke aplikasi, bukan domain organisasi
UPDATE settings
SET value = REPLACE(value, E'silahkan membuat transaksi baru di:\n{store_website}', E'silahkan membuat transaksi baru di:\n{frontend_url}')
WHERE key = 'wa_tpl_payment_expired'
  AND value LIKE '%transaksi baru di:%{store_website}%';
