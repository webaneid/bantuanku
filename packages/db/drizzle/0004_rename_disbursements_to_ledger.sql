-- Migration: Rename disbursements table to ledger
-- This migration renames the disbursements table to ledger to better reflect its purpose

-- Rename the table
ALTER TABLE "disbursements" RENAME TO "ledger";

-- Note: Indexes, constraints, and sequences are automatically renamed by PostgreSQL
-- when the table is renamed, so no additional changes needed for those.
