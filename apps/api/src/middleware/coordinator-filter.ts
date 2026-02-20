import type { Context, Next } from "hono";
import { employees } from "@bantuanku/db";
import { eq } from "drizzle-orm";
import type { Variables } from "../types";

/**
 * Middleware to filter data by coordinator for Program Coordinator & Employee roles
 *
 * If user has role "program_coordinator" or "employee" (without admin roles):
 * 1. Get employee record by user_id
 * 2. Add employeeId to context for filtering campaigns/distributions
 *
 * Admin roles (super_admin, admin_campaign, admin_finance) can see all data
 */
export async function coordinatorFilter(c: Context<{ Variables: Variables }>, next: Next) {
  const currentUser = c.get("user");
  const db = c.get("db");

  // Check if user has program_coordinator role
  const isProgramCoordinator = currentUser?.roles?.includes("program_coordinator");

  // Check if user has employee role but NOT any admin role that should see all
  const isEmployeeOnly = currentUser?.roles?.includes("employee") &&
    !currentUser?.roles?.includes("super_admin") &&
    !currentUser?.roles?.includes("admin_campaign") &&
    !currentUser?.roles?.includes("admin_finance");

  if (isProgramCoordinator || isEmployeeOnly) {
    // Get employee record linked to this user
    const employee = await db.query.employees.findFirst({
      where: eq(employees.userId, currentUser!.id),
    });

    if (employee) {
      // Store employee ID in context for filtering
      c.set("coordinatorEmployeeId", employee.id);
    } else {
      // If no employee record, filter to empty results (show nothing)
      // This is safer than blocking the request
      c.set("coordinatorEmployeeId", "no-employee-record");
    }
  } else {
    // For admin roles, set null (means no filter, can see all)
    c.set("coordinatorEmployeeId", null);
  }

  await next();
}
