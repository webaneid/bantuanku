-- Insert Flip gateway to payment_gateways table
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
  'flip_' || substr(md5(random()::text), 1, 20),
  'flip',
  'Flip',
  'Payment gateway Flip - Virtual Account dan Payment Link',
  null,
  'auto',
  true,
  4,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;

-- Verify the insert
SELECT * FROM payment_gateways WHERE code = 'flip';
