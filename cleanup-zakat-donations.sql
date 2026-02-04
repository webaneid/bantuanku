-- Backup dulu (untuk jaga-jaga)
-- Hitung jumlah records yang akan dihapus
SELECT 'zakat_donations to delete:' as info, COUNT(*) as count FROM zakat_donations;
SELECT 'ledger entries to delete:' as info, COUNT(*) as count FROM ledger WHERE purpose LIKE 'Penerimaan Zakat%';

-- Delete ledger entries yang auto-created untuk zakat
DELETE FROM ledger WHERE purpose LIKE 'Penerimaan Zakat%';

-- Delete all zakat donations
DELETE FROM zakat_donations;

-- Verify deletion
SELECT 'Remaining zakat_donations:' as info, COUNT(*) as count FROM zakat_donations;
SELECT 'Remaining ledger (zakat):' as info, COUNT(*) as count FROM ledger WHERE purpose LIKE 'Penerimaan Zakat%';
