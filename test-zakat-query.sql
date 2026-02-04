-- Test query untuk cek data zakat
SELECT 'zakat_donations' as source, COUNT(*) as total 
FROM zakat_donations 
WHERE payment_status = 'success';

SELECT 'zakat_distributions' as source, COUNT(*) as total 
FROM zakat_distributions 
WHERE status IN ('disbursed', 'approved');

-- Sample data
SELECT id, donor_name, amount, payment_status, paid_at, created_at 
FROM zakat_donations 
LIMIT 3;

SELECT id, recipient_name, amount, status, disbursed_at, created_at 
FROM zakat_distributions 
LIMIT 3;
