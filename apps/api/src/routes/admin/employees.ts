import { Hono } from "hono";
import {
  employees,
  users,
  userRoles,
  roles,
  createId,
  indonesiaProvinces,
  indonesiaRegencies,
  indonesiaDistricts,
  indonesiaVillages,
  entityBankAccounts,
} from "@bantuanku/db";
import { eq, ilike, or, desc, and, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireRoles } from "../../middleware/auth";
import type { Env, Variables } from "../../types";
import bcrypt from "bcryptjs";
import { normalizeContactData } from "../../lib/contact-helpers";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply auth middleware to all routes
app.use("*", requireAuth);

// Bank account validation schema
const bankAccountSchema = z.object({
  id: z.string().optional(),
  bankName: z.string().min(1, "Nama bank wajib diisi"),
  accountNumber: z.string().min(1, "Nomor rekening wajib diisi"),
  accountHolderName: z.string().min(1, "Nama pemilik rekening wajib diisi"),
});

// Validation schema
const employeeSchema = z.object({
  employeeId: z.string().optional(),
  name: z.string().min(1, "Nama karyawan wajib diisi"),
  position: z.string().min(1, "Posisi wajib diisi"),
  department: z.string().optional(),
  employmentType: z.string().optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  website: z.string().optional(),

  // New address system (preferred)
  detailAddress: z.string().optional(),
  provinceCode: z.string().optional(),
  regencyCode: z.string().optional(),
  districtCode: z.string().optional(),
  villageCode: z.string().optional(),
  postalCode: z.string().optional().nullable(), // From AddressForm, not stored in DB

  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  joinDate: z.string().optional(),
  endDate: z.string().optional(),
  salary: z.number().optional(),
  allowance: z.number().optional(),

  // Bank accounts - handled separately
  bankAccounts: z.array(bankAccountSchema).optional(),

  // Legacy bank fields - will be deprecated
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankAccountName: z.string().optional(),

  taxId: z.string().optional(),
  nationalId: z.string().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

// GET /admin/employees - List with pagination and filters
app.get("/", async (c) => {
  try {
    const db = c.get("db");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const search = c.req.query("search") || "";
    const department = c.req.query("department") || "";
    const status = c.req.query("status") || "";

    const offset = (page - 1) * limit;

    let conditions = [];

    // Search filter
    if (search) {
      conditions.push(
        or(
          ilike(employees.name, `%${search}%`),
          ilike(employees.employeeId, `%${search}%`),
          ilike(employees.position, `%${search}%`),
          ilike(employees.email, `%${search}%`)
        )
      );
    }

    // Department filter
    if (department) {
      conditions.push(eq(employees.department, department));
    }

    // Status filter
    if (status === "active") {
      conditions.push(eq(employees.isActive, true));
    } else if (status === "inactive") {
      conditions.push(eq(employees.isActive, false));
    }

    const whereClause = conditions.length > 0 ? (conditions.length > 1 ? and(...conditions) : conditions[0]) : undefined;

    // Get employees with address data
    const employeeList = await db
      .select({
        id: employees.id,
        employeeId: employees.employeeId,
        name: employees.name,
        position: employees.position,
        department: employees.department,
        employmentType: employees.employmentType,
        email: employees.email,
        phone: employees.phone,
        whatsappNumber: employees.whatsappNumber,
        website: employees.website,
        detailAddress: employees.detailAddress,
        provinceCode: employees.provinceCode,
        regencyCode: employees.regencyCode,
        districtCode: employees.districtCode,
        villageCode: employees.villageCode,
        emergencyContact: employees.emergencyContact,
        emergencyPhone: employees.emergencyPhone,
        joinDate: employees.joinDate,
        endDate: employees.endDate,
        salary: employees.salary,
        allowance: employees.allowance,
        bankName: employees.bankName,
        bankAccount: employees.bankAccount,
        bankAccountName: employees.bankAccountName,
        taxId: employees.taxId,
        nationalId: employees.nationalId,
        isActive: employees.isActive,
        notes: employees.notes,
        userId: employees.userId,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        // Address names from joined tables
        provinceName: indonesiaProvinces.name,
        regencyName: indonesiaRegencies.name,
        districtName: indonesiaDistricts.name,
        villageName: indonesiaVillages.name,
        villagePostalCode: indonesiaVillages.postalCode,
      })
      .from(employees)
      .leftJoin(indonesiaProvinces, eq(employees.provinceCode, indonesiaProvinces.code))
      .leftJoin(indonesiaRegencies, eq(employees.regencyCode, indonesiaRegencies.code))
      .leftJoin(indonesiaDistricts, eq(employees.districtCode, indonesiaDistricts.code))
      .leftJoin(indonesiaVillages, eq(employees.villageCode, indonesiaVillages.code))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(employees.createdAt));

    // Fetch bank accounts for all employees
    const employeeIds = employeeList.map((e) => e.id);
    const bankAccountsList = employeeIds.length > 0
      ? await db
          .select()
          .from(entityBankAccounts)
          .where(
            and(
              eq(entityBankAccounts.entityType, "employee"),
              or(...employeeIds.map((id) => eq(entityBankAccounts.entityId, id)))
            )
          )
      : [];

    // Group bank accounts by employee ID
    const bankAccountsMap = new Map<string, typeof bankAccountsList>();
    bankAccountsList.forEach((account) => {
      const existing = bankAccountsMap.get(account.entityId) || [];
      bankAccountsMap.set(account.entityId, [...existing, account]);
    });

    // Attach bank accounts to employees
    const employeeListWithBankAccounts = employeeList.map((employee) => ({
      ...employee,
      bankAccounts: bankAccountsMap.get(employee.id) || [],
    }));

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(whereClause);

    const total = Number(countResult[0]?.count || 0);

    return c.json({
      data: employeeListWithBankAccounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching employees:", error);
    return c.json({ error: "Failed to fetch employees" }, 500);
  }
});

// GET /admin/employees/:id - Get single employee
app.get("/:id", async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");

    console.log("📖 GET EMPLOYEE - ID:", id);

    const result = await db
      .select({
        id: employees.id,
        employeeId: employees.employeeId,
        name: employees.name,
        position: employees.position,
        department: employees.department,
        employmentType: employees.employmentType,
        email: employees.email,
        phone: employees.phone,
        whatsappNumber: employees.whatsappNumber,
        website: employees.website,
        detailAddress: employees.detailAddress,
        provinceCode: employees.provinceCode,
        regencyCode: employees.regencyCode,
        districtCode: employees.districtCode,
        villageCode: employees.villageCode,
        emergencyContact: employees.emergencyContact,
        emergencyPhone: employees.emergencyPhone,
        joinDate: employees.joinDate,
        endDate: employees.endDate,
        salary: employees.salary,
        allowance: employees.allowance,
        bankName: employees.bankName,
        bankAccount: employees.bankAccount,
        bankAccountName: employees.bankAccountName,
        taxId: employees.taxId,
        nationalId: employees.nationalId,
        isActive: employees.isActive,
        notes: employees.notes,
        userId: employees.userId,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        // Address names
        provinceName: indonesiaProvinces.name,
        regencyName: indonesiaRegencies.name,
        districtName: indonesiaDistricts.name,
        villageName: indonesiaVillages.name,
        villagePostalCode: indonesiaVillages.postalCode,
      })
      .from(employees)
      .leftJoin(indonesiaProvinces, eq(employees.provinceCode, indonesiaProvinces.code))
      .leftJoin(indonesiaRegencies, eq(employees.regencyCode, indonesiaRegencies.code))
      .leftJoin(indonesiaDistricts, eq(employees.districtCode, indonesiaDistricts.code))
      .leftJoin(indonesiaVillages, eq(employees.villageCode, indonesiaVillages.code))
      .where(eq(employees.id, id))
      .limit(1);

    if (!result || result.length === 0) {
      return c.json({ error: "Employee not found" }, 404);
    }

    console.log("📦 GET EMPLOYEE - Address data:", JSON.stringify({
      detailAddress: result[0].detailAddress,
      provinceCode: result[0].provinceCode,
      regencyCode: result[0].regencyCode,
      districtCode: result[0].districtCode,
      villageCode: result[0].villageCode,
      provinceName: result[0].provinceName,
      regencyName: result[0].regencyName,
      districtName: result[0].districtName,
      villageName: result[0].villageName,
      villagePostalCode: result[0].villagePostalCode,
    }, null, 2));

    // Fetch bank accounts for this employee
    const bankAccountsList = await db
      .select()
      .from(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "employee"),
          eq(entityBankAccounts.entityId, id)
        )
      );

    return c.json({
      data: {
        ...result[0],
        bankAccounts: bankAccountsList,
      },
    });
  } catch (error: any) {
    console.error("Error fetching employee:", error);
    return c.json({ error: "Failed to fetch employee" }, 500);
  }
});

// POST /admin/employees - Create new employee
app.post("/", requireRoles("super_admin", "admin_campaign"), async (c) => {
  try {
    const db = c.get("db");
    const body = await c.req.json();

    console.log("📥 CREATE EMPLOYEE - Received body:", JSON.stringify(body, null, 2));

    const validated = employeeSchema.parse(body);

    // Normalize contact data
    const normalizedBody = normalizeContactData(validated);

    // Remove postalCode as it's not stored in employees table
    // Extract bank accounts
    const { postalCode, bankAccounts, ...employeeData } = normalizedBody;

    console.log("📦 After validation - employeeData:", JSON.stringify({
      detailAddress: employeeData.detailAddress,
      provinceCode: employeeData.provinceCode,
      regencyCode: employeeData.regencyCode,
      districtCode: employeeData.districtCode,
      villageCode: employeeData.villageCode,
    }, null, 2));

    // Convert empty strings to null for optional fields (to avoid UNIQUE constraint issues)
    const cleanData: any = {
      ...employeeData,
      employeeId: employeeData.employeeId || null,
      email: employeeData.email || null,
      phone: employeeData.phone || null,
      whatsappNumber: employeeData.whatsappNumber || null,
      website: employeeData.website || null,
      department: employeeData.department || null,
      employmentType: employeeData.employmentType || null,
      detailAddress: employeeData.detailAddress || null,
      provinceCode: employeeData.provinceCode || null,
      regencyCode: employeeData.regencyCode || null,
      districtCode: employeeData.districtCode || null,
      villageCode: employeeData.villageCode || null,
      emergencyContact: employeeData.emergencyContact || null,
      emergencyPhone: employeeData.emergencyPhone || null,
      bankName: employeeData.bankName || null,
      bankAccount: employeeData.bankAccount || null,
      bankAccountName: employeeData.bankAccountName || null,
      taxId: employeeData.taxId || null,
      nationalId: employeeData.nationalId || null,
      notes: employeeData.notes || null,
      joinDate: validated.joinDate ? new Date(validated.joinDate) : null,
      endDate: validated.endDate ? new Date(validated.endDate) : null,
      isActive: validated.isActive ?? true,
    };

    const [newEmployee] = await db
      .insert(employees)
      .values(cleanData)
      .returning();

    // Insert bank accounts if provided
    if (bankAccounts && bankAccounts.length > 0) {
      const bankAccountsToInsert = bankAccounts.map((account: any) => ({
        entityType: "employee",
        entityId: newEmployee.id,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountHolderName: account.accountHolderName,
      }));

      await db.insert(entityBankAccounts).values(bankAccountsToInsert);
    }

    // Fetch the created bank accounts
    const createdBankAccounts = await db
      .select()
      .from(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "employee"),
          eq(entityBankAccounts.entityId, newEmployee.id)
        )
      );

    return c.json({
      data: {
        ...newEmployee,
        bankAccounts: createdBankAccounts,
      },
    }, 201);
  } catch (error: any) {
    console.error("Error creating employee:", error);
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors[0].message }, 400);
    }
    return c.json({ error: "Failed to create employee" }, 500);
  }
});

// PUT /admin/employees/:id - Update employee
app.put("/:id", requireRoles("super_admin", "admin_campaign"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");
    const body = await c.req.json();
    const validated = employeeSchema.parse(body);

    // Normalize contact data
    const normalizedBody = normalizeContactData(validated);

    // Remove postalCode as it's not stored in employees table
    // Extract bank accounts
    const { postalCode, bankAccounts, ...employeeData } = normalizedBody;

    // Convert empty strings to null for optional fields (to avoid UNIQUE constraint issues)
    const cleanData: any = {
      ...employeeData,
      employeeId: employeeData.employeeId || null,
      email: employeeData.email || null,
      phone: employeeData.phone || null,
      whatsappNumber: employeeData.whatsappNumber || null,
      website: employeeData.website || null,
      department: employeeData.department || null,
      employmentType: employeeData.employmentType || null,
      detailAddress: employeeData.detailAddress || null,
      provinceCode: employeeData.provinceCode || null,
      regencyCode: employeeData.regencyCode || null,
      districtCode: employeeData.districtCode || null,
      villageCode: employeeData.villageCode || null,
      emergencyContact: employeeData.emergencyContact || null,
      emergencyPhone: employeeData.emergencyPhone || null,
      bankName: employeeData.bankName || null,
      bankAccount: employeeData.bankAccount || null,
      bankAccountName: employeeData.bankAccountName || null,
      taxId: employeeData.taxId || null,
      nationalId: employeeData.nationalId || null,
      notes: employeeData.notes || null,
      joinDate: validated.joinDate ? new Date(validated.joinDate) : null,
      endDate: validated.endDate ? new Date(validated.endDate) : null,
      updatedAt: new Date(),
    };

    const [updatedEmployee] = await db
      .update(employees)
      .set(cleanData)
      .where(eq(employees.id, id))
      .returning();

    if (!updatedEmployee) {
      return c.json({ error: "Employee not found" }, 404);
    }

    // Update bank accounts - delete old ones and insert new ones
    if (bankAccounts !== undefined) {
      // Delete existing bank accounts
      await db
        .delete(entityBankAccounts)
        .where(
          and(
            eq(entityBankAccounts.entityType, "employee"),
            eq(entityBankAccounts.entityId, id)
          )
        );

      // Insert new bank accounts if any
      if (bankAccounts && bankAccounts.length > 0) {
        const bankAccountsToInsert = bankAccounts.map((account: any) => ({
          entityType: "employee",
          entityId: id,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          accountHolderName: account.accountHolderName,
        }));

        await db.insert(entityBankAccounts).values(bankAccountsToInsert);
      }
    }

    // Fetch updated bank accounts
    const updatedBankAccounts = await db
      .select()
      .from(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "employee"),
          eq(entityBankAccounts.entityId, id)
        )
      );

    return c.json({
      data: {
        ...updatedEmployee,
        bankAccounts: updatedBankAccounts,
      },
    });
  } catch (error: any) {
    console.error("Error updating employee:", error);
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors[0].message }, 400);
    }
    return c.json({ error: "Failed to update employee" }, 500);
  }
});

// DELETE /admin/employees/:id - Delete employee
app.delete("/:id", requireRoles("super_admin", "admin_campaign"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");

    // Delete associated bank accounts first
    await db
      .delete(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "employee"),
          eq(entityBankAccounts.entityId, id)
        )
      );

    const [deletedEmployee] = await db
      .delete(employees)
      .where(eq(employees.id, id))
      .returning();

    if (!deletedEmployee) {
      return c.json({ error: "Employee not found" }, 404);
    }

    return c.json({ message: "Employee deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting employee:", error);
    return c.json({ error: "Failed to delete employee" }, 500);
  }
});

// POST /admin/employees/:id/activate-user - Activate employee as user account
app.post("/:id/activate-user", requireRoles("super_admin"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");
    const body = await c.req.json();

    // Validate request body
    const schema = z.object({
      email: z.string().email("Email tidak valid"),
      password: z.string().min(8, "Password minimal 8 karakter"),
      roleSlug: z.string().min(1, "Role wajib dipilih"),
    });

    const { email, password, roleSlug } = schema.parse(body);

    // 1. Check if employee exists and doesn't have user_id yet
    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, id),
    });

    if (!employee) {
      return c.json({ error: "Employee not found" }, 404);
    }

    if (employee.userId) {
      return c.json({ error: "Employee sudah memiliki akun user" }, 400);
    }

    // 2. Check if email is already used
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return c.json({ error: "Email sudah digunakan" }, 400);
    }

    // 3. Check if role exists
    const role = await db.query.roles.findFirst({
      where: eq(roles.slug, roleSlug),
    });

    if (!role) {
      return c.json({ error: "Role tidak ditemukan" }, 404);
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Create user account
    const [newUser] = await db
      .insert(users)
      .values({
        id: createId(),
        email,
        passwordHash,
        name: employee.name,
        phone: employee.phone || null,
        isActive: true,
      })
      .returning();

    // 6. Assign role to user
    await db.insert(userRoles).values({
      id: createId(),
      userId: newUser.id,
      roleId: role.id,
    });

    // 7. Update employee with user_id
    const [updatedEmployee] = await db
      .update(employees)
      .set({
        userId: newUser.id,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning();

    return c.json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
        employee: updatedEmployee,
        role: {
          id: role.id,
          slug: role.slug,
          name: role.name,
        },
      },
    }, 201);
  } catch (error: any) {
    console.error("Error activating employee as user:", error);
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors[0].message }, 400);
    }
    return c.json({ error: "Failed to activate employee as user" }, 500);
  }
});

// GET /admin/employees/unactivated - List employees without user accounts
app.get("/unactivated/list", requireRoles("super_admin"), async (c) => {
  try {
    const db = c.get("db");

    const unactivatedEmployees = await db.query.employees.findMany({
      where: and(
        eq(employees.isActive, true),
        isNull(employees.userId)
      ),
      orderBy: [desc(employees.createdAt)],
    });

    return c.json({
      data: unactivatedEmployees,
      total: unactivatedEmployees.length,
    });
  } catch (error: any) {
    console.error("Error fetching unactivated employees:", error);
    return c.json({ error: "Failed to fetch unactivated employees" }, 500);
  }
});

// PUT /admin/employees/:id/change-role - Change employee user role
app.put("/:id/change-role", requireRoles("super_admin", "admin_campaign"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");
    const body = await c.req.json();

    const schema = z.object({
      roleSlug: z.string().min(1, "Role wajib dipilih"),
    });

    const { roleSlug } = schema.parse(body);

    // 1. Get employee
    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, id),
    });

    if (!employee) {
      return c.json({ error: "Employee not found" }, 404);
    }

    if (!employee.userId) {
      return c.json({ error: "Employee belum memiliki akun user. Aktivasi terlebih dahulu." }, 400);
    }

    // 2. Get new role
    const newRole = await db.query.roles.findFirst({
      where: eq(roles.slug, roleSlug),
    });

    if (!newRole) {
      return c.json({ error: "Role tidak ditemukan" }, 404);
    }

    // 3. Delete existing roles for this user
    await db
      .delete(userRoles)
      .where(eq(userRoles.userId, employee.userId));

    // 4. Assign new role
    await db.insert(userRoles).values({
      id: createId(),
      userId: employee.userId,
      roleId: newRole.id,
    });

    return c.json({
      success: true,
      data: {
        employeeId: id,
        userId: employee.userId,
        newRole: {
          id: newRole.id,
          slug: newRole.slug,
          name: newRole.name,
        },
      },
      message: `Role berhasil diubah ke ${newRole.name}`,
    });
  } catch (error: any) {
    console.error("Error changing employee role:", error);
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors[0].message }, 400);
    }
    return c.json({ error: "Failed to change role" }, 500);
  }
});

export default app;
