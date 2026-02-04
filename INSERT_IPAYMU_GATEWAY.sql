-- Insert iPaymu gateway to payment_gateways table
INSERT INTO payment_gateways (
  id,
  code,
  name,
  description,
  logo,
  type,
  is_active,
  sort_order,
  created_at,
  updated_at
)
VALUES (
  'ipaymu_' || substr(md5(random()::text), 1, 20),
  'ipaymu',
  'iPaymu',
  'Payment gateway iPaymu - Virtual Account, QRIS, E-wallet, dan lainnya',
  null,
  'auto',
  true,
  3,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;

-- Verify the insert
SELECT * FROM payment_gateways WHERE code = 'ipaymu';
