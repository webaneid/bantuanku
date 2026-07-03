import { eq, sql } from "drizzle-orm";
import { bankAccounts } from "@bantuanku/db";
import type { Database } from "@bantuanku/db";

/**
 * Update bank balance (sesuai blueprint COA)
 * @param db - Database instance
 * @param bankAccountId - Bank account ID
 * @param amount - Amount to add/subtract (positive = increase, negative = decrease)
 */
export async function updateBankBalance(
  db: Database,
  bankAccountId: string,
  amount: number
): Promise<void> {
  await db
    .update(bankAccounts)
    .set({
      balance: sql`${bankAccounts.balance} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(bankAccounts.id, bankAccountId));
}
