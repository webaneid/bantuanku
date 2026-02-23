-- Remove legacy COA accounts that are no longer used
-- Only keep the 11 blueprint COA (7 bank + 4 income)

DELETE FROM chart_of_accounts
WHERE code NOT IN ('6201','6202','6203','6204','6205','6206','6210','4300','4310','4311','4312');
