-- Add WhatsApp notification templates for Mitra and Fundraiser

INSERT INTO settings (id, key, value, type, label, description, category, sort_order, is_public) VALUES
-- Mitra: notifikasi donasi masuk ke program mitra
  (gen_random_uuid()::text, 'wa_tpl_mitra_donation_received_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Donasi Masuk Mitra', 'whatsapp_template', 60, false),
  (gen_random_uuid()::text, 'wa_tpl_mitra_donation_received', 'Yth. {mitra_name},

Ada donasi baru masuk ke program Anda! 🎉

Detail:
• Program: {product_name}
• Donatur: {donor_name}
• Jumlah: {donation_amount}
• Bagi Hasil Mitra: {mitra_amount}
• Tanggal: {paid_date}

Saldo bagi hasil Anda saat ini: {mitra_balance}

{store_name}
{store_whatsapp}', 'text', 'Donasi Masuk ke Program Mitra', 'Dikirim ke mitra saat ada donasi masuk ke program miliknya', 'whatsapp_template', 61, false),

-- Fundraiser: notifikasi referral berhasil
  (gen_random_uuid()::text, 'wa_tpl_fundraiser_referral_enabled', 'true', 'boolean', 'Aktif', 'Toggle template Referral Fundraiser', 'whatsapp_template', 62, false),
  (gen_random_uuid()::text, 'wa_tpl_fundraiser_referral', 'Halo {fundraiser_name},

Ada donasi baru melalui link referral Anda! 💰

Detail:
• Program: {product_name}
• Donatur: {donor_name}
• Jumlah Donasi: {donation_amount}
• Komisi Anda ({commission_percentage}): {commission_amount}

Total referral: {total_referrals} donasi
Saldo komisi: {fundraiser_balance}

Terus semangat berbagi kebaikan!

{store_name}
{store_whatsapp}', 'text', 'Referral Fundraiser Berhasil', 'Dikirim ke fundraiser saat ada donasi melalui link referralnya', 'whatsapp_template', 63, false)

ON CONFLICT (key) DO NOTHING;
