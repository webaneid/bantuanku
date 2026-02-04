import type { Context, Next } from "hono";
import { employees } from "@bantuanku/db";
import { eq } from "drizzle-orm";
import type { Variables } from "../types";

/**
 * Middleware to filter data by coordinator for Program Coordinator role
 *
 * If user has role "program_coordinator":
 * 1. Get employee record by user_id
 * 2. Add employeeId to context for filtering campaigns/distributions
 *
 * Other roles (super_admin, admin_campaign, admin_finance) can see all data
 */
export async function coordinatorFilter(c: Context<{ Variables: Variables }>, next: Next) {
  const currentUser = c.get("user");
  const db = c.get("db");

  // Check if user has program_coordinator role
  const isProgramCoordinator = currentUser?.roles?.includes("program_coordinator");

  if (isProgramCoordinator) {
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
    // For other roles, set null (means no filter, can see all)
    c.set("coordinatorEmployeeId", null);
  }

  await next();
}
