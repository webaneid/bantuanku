/**
 * @deprecated Legacy Ledger Categories Endpoint
 *
 * This endpoint serves the new category system for unified disbursements.
 * The legacy /admin/ledger routes are deprecated, but this categories endpoint
 * is still active as it's used by the new disbursement system.
 */
import { Hono } from "hono";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@bantuanku/db";
import { success } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const ledgerCategoriesAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /admin/ledger/categories - List all ledger categories
ledgerCategoriesAdmin.get("/", requireRole("super_admin", "admin_finance"), async (c) => {
  const type = c.req.query("type"); // 'income' or 'expense'
  const productType = c.req.query("product_type"); // 'campaign', 'zakat', 'qurban', 'operational'

  if (type === "income") {
    if (productType) {
      const categories = INCOME_CATEGORIES[productType as keyof typeof INCOME_CATEGORIES] || [];
      return success(c, {
        type: "income",
        productType,
        categories,
      });
    }

    // Return all income categories grouped
    return success(c, {
      type: "income",
      categories: INCOME_CATEGORIES,
    });
  }

  if (type === "expense") {
    if (productType) {
      const categories = EXPENSE_CATEGORIES[productType as keyof typeof EXPENSE_CATEGORIES] || [];
      return success(c, {
        type: "expense",
        productType,
        categories,
      });
    }

    // Return all expense categories grouped
    return success(c, {
      type: "expense",
      categories: EXPENSE_CATEGORIES,
    });
  }

  // Return both income and expense
  return success(c, {
    income: INCOME_CATEGORIES,
    expense: EXPENSE_CATEGORIES,
  });
});

// GET /admin/ledger/categories/income - List income categories
ledgerCategoriesAdmin.get("/income", requireRole("super_admin", "admin_finance"), async (c) => {
  const productType = c.req.query("product_type");

  if (productType) {
    const categories = INCOME_CATEGORIES[productType as keyof typeof INCOME_CATEGORIES] || [];
    return success(c, {
      productType,
      categories,
    });
  }

  return success(c, INCOME_CATEGORIES);
});

// GET /admin/ledger/categories/expense - List expense categories
ledgerCategoriesAdmin.get("/expense", requireRole("super_admin", "admin_finance"), async (c) => {
  const productType = c.req.query("product_type");

  if (productType) {
    const categories = EXPENSE_CATEGORIES[productType as keyof typeof EXPENSE_CATEGORIES] || [];
    return success(c, {
      productType,
      categories,
    });
  }

  return success(c, EXPENSE_CATEGORIES);
});

// GET /admin/ledger/categories/flat - List all categories in flat array format
ledgerCategoriesAdmin.get("/flat", requireRole("super_admin", "admin_finance"), async (c) => {
  const type = c.req.query("type"); // 'income', 'expense', or both

  const flatIncome = Object.entries(INCOME_CATEGORIES).flatMap(([productType, categories]) =>
    categories.map(cat => ({
      ...cat,
      productType,
      type: 'income',
    }))
  );

  const flatExpense = Object.entries(EXPENSE_CATEGORIES).flatMap(([productType, categories]) =>
    categories.map(cat => ({
      ...cat,
      productType,
      type: 'expense',
    }))
  );

  if (type === "income") {
    return success(c, flatIncome);
  }

  if (type === "expense") {
    return success(c, flatExpense);
  }

  return success(c, {
    income: flatIncome,
    expense: flatExpense,
    all: [...flatIncome, ...flatExpense],
  });
});

export default ledgerCategoriesAdmin;
