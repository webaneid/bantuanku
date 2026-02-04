#!/bin/bash
# Run all qurban migrations

echo "Running qurban migrations..."

# Connection string
DB_URL="postgresql://webane@localhost:5432/bantuanku"

# Run each migration file
psql $DB_URL -f packages/db/migrations/010_create_qurban_orders.sql
psql $DB_URL -f packages/db/migrations/011_create_qurban_payments.sql
psql $DB_URL -f packages/db/migrations/012_create_qurban_savings.sql
psql $DB_URL -f packages/db/migrations/013_create_qurban_savings_transactions.sql
psql $DB_URL -f packages/db/migrations/014_create_qurban_executions.sql

echo ""
echo "Verifying tables..."
psql $DB_URL -c "\dt qurban*"

echo ""
echo "Done!"
