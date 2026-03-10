import { Hono } from "hono";
import {
  employees,
  donatur,
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

// POST /admin/employees/from-donatur - Create employee from existing donatur
app.post("/from-donatur", requireRoles("super_admin", "admin_campaign"), async (c) => {
  try {
    const db = c.get("db");
    const body = await c.req.json();

    const schema = z.object({
      donaturId: z.string().min(1, "Donatur ID wajib diisi"),
      position: z.string().min(1, "Posisi wajib diisi"),
      department: z.string().optional(),
      employmentType: z.string().optional(),
      employeeId: z.string().optional(),
      notes: z.string().optional(),
    });

    const validated = schema.parse(body);

    // 1. Get donatur data
    const donaturRecord = await db.query.donatur.findFirst({
      where: eq(donatur.id, validated.donaturId),
    });

    if (!donaturRecord) {
      return c.json({ error: "Donatur tidak ditemukan" }, 404);
    }

    // 2. Check if employee already exists with same userId
    if (donaturRecord.userId) {
      const existingEmployee = await db.query.employees.findFirst({
        where: eq(employees.userId, donaturRecord.userId),
      });
      if (existingEmployee) {
        return c.json({ error: "Donatur ini sudah terdaftar sebagai employee" }, 400);
      }
    }

    // 3. Create employee with data from donatur
    const [newEmployee] = await db
      .insert(employees)
      .values({
        name: donaturRecord.name,
        position: validated.position,
        department: validated.department || null,
        employmentType: validated.employmentType || null,
        employeeId: validated.employeeId || null,
        email: donaturRecord.email,
        phone: donaturRecord.phone || null,
        whatsappNumber: donaturRecord.whatsappNumber || null,
        website: donaturRecord.website || null,
        detailAddress: donaturRecord.detailAddress || null,
        provinceCode: donaturRecord.provinceCode || null,
        regencyCode: donaturRecord.regencyCode || null,
        districtCode: donaturRecord.districtCode || null,
        villageCode: donaturRecord.villageCode || null,
        nationalId: donaturRecord.nik || null,
        taxId: donaturRecord.npwp || null,
        userId: donaturRecord.userId || null,
        notes: validated.notes || null,
        isActive: true,
      })
      .returning();

    // 4. If donatur has userId, assign employee role
    if (donaturRecord.userId) {
      const employeeRole = await db.query.roles.findFirst({
        where: eq(roles.slug, "employee"),
      });
      if (employeeRole) {
        // Check if already has employee role
        const existingRole = await db.query.userRoles.findFirst({
          where: and(
            eq(userRoles.userId, donaturRecord.userId),
            eq(userRoles.roleId, employeeRole.id)
          ),
        });
        if (!existingRole) {
          await db.insert(userRoles).values({
            id: createId(),
            userId: donaturRecord.userId,
            roleId: employeeRole.id,
          });
        }
      }
    }

    // 5. Copy bank accounts from donatur to employee
    const donaturBankAccounts = await db
      .select()
      .from(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "donatur"),
          eq(entityBankAccounts.entityId, donaturRecord.id)
        )
      );

    if (donaturBankAccounts.length > 0) {
      await db.insert(entityBankAccounts).values(
        donaturBankAccounts.map((acc) => ({
          entityType: "employee",
          entityId: newEmployee.id,
          bankName: acc.bankName,
          accountNumber: acc.accountNumber,
          accountHolderName: acc.accountHolderName,
        }))
      );
    }

    return c.json({
      data: newEmployee,
      message: "Employee berhasil dibuat dari data donatur",
    }, 201);
  } catch (error: any) {
    console.error("Error creating employee from donatur:", error);
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors[0].message }, 400);
    }
    return c.json({ error: "Failed to create employee from donatur" }, 500);
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

    // Ensure donatur record exists for this employee
    if (newEmployee.email) {
      const existingDonatur = await db.query.donatur.findFirst({
        where: eq(donatur.email, newEmployee.email),
      });
      if (!existingDonatur) {
        await db.insert(donatur).values({
          id: createId(),
          email: newEmployee.email,
          name: newEmployee.name,
          phone: newEmployee.phone || null,
          whatsappNumber: newEmployee.whatsappNumber || null,
          website: newEmployee.website || null,
          detailAddress: newEmployee.detailAddress || null,
          provinceCode: newEmployee.provinceCode || null,
          regencyCode: newEmployee.regencyCode || null,
          districtCode: newEmployee.districtCode || null,
          villageCode: newEmployee.villageCode || null,
          nik: newEmployee.nationalId || null,
          npwp: newEmployee.taxId || null,
          userId: newEmployee.userId || null,
        });
      }
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

    // If deactivating employee, remove employee role from user_roles
    if (validated.isActive === false && updatedEmployee.userId) {
      const employeeRole = await db.query.roles.findFirst({
        where: eq(roles.slug, "employee"),
      });
      if (employeeRole) {
        await db
          .delete(userRoles)
          .where(
            and(
              eq(userRoles.userId, updatedEmployee.userId),
              eq(userRoles.roleId, employeeRole.id)
            )
          );
      }
    }

    // If re-activating employee, ensure employee role exists
    if (validated.isActive === true && updatedEmployee.userId) {
      const employeeRole = await db.query.roles.findFirst({
        where: eq(roles.slug, "employee"),
      });
      if (employeeRole) {
        const existingRole = await db.query.userRoles.findFirst({
          where: and(
            eq(userRoles.userId, updatedEmployee.userId),
            eq(userRoles.roleId, employeeRole.id)
          ),
        });
        if (!existingRole) {
          await db.insert(userRoles).values({
            id: createId(),
            userId: updatedEmployee.userId,
            roleId: employeeRole.id,
          });
        }
      }
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

    // Sync shared fields to donatur if linked via userId
    if (updatedEmployee.userId) {
      const linkedDonatur = await db.query.donatur.findFirst({
        where: eq(donatur.userId, updatedEmployee.userId),
      });
      if (linkedDonatur) {
        await db
          .update(donatur)
          .set({
            name: updatedEmployee.name,
            phone: updatedEmployee.phone || null,
            whatsappNumber: updatedEmployee.whatsappNumber || null,
            website: updatedEmployee.website || null,
            detailAddress: updatedEmployee.detailAddress || null,
            provinceCode: updatedEmployee.provinceCode || null,
            regencyCode: updatedEmployee.regencyCode || null,
            districtCode: updatedEmployee.districtCode || null,
            villageCode: updatedEmployee.villageCode || null,
            nik: updatedEmployee.nationalId || null,
            npwp: updatedEmployee.taxId || null,
            updatedAt: new Date(),
          })
          .where(eq(donatur.id, linkedDonatur.id));

        // Sync to users table too
        await db
          .update(users)
          .set({
            name: updatedEmployee.name,
            phone: updatedEmployee.phone || null,
            whatsappNumber: updatedEmployee.whatsappNumber || null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, updatedEmployee.userId));
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

    // 1. Get employee
    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, id),
    });

    if (!employee) {
      return c.json({ error: "Employee not found" }, 404);
    }

    // Case A: Employee already has userId (e.g. created from donatur) → just assign role
    if (employee.userId) {
      const schema = z.object({
        roleSlug: z.string().min(1, "Role wajib dipilih"),
      });
      const { roleSlug } = schema.parse(body);

      const role = await db.query.roles.findFirst({
        where: eq(roles.slug, roleSlug),
      });
      if (!role) {
        return c.json({ error: "Role tidak ditemukan" }, 404);
      }

      // Remove existing roles and assign new one
      await db.delete(userRoles).where(eq(userRoles.userId, employee.userId));
      await db.insert(userRoles).values({
        id: createId(),
        userId: employee.userId,
        roleId: role.id,
      });

      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, employee.userId),
      });

      return c.json({
        success: true,
        data: {
          user: {
            id: employee.userId,
            email: existingUser?.email || employee.email,
            name: existingUser?.name || employee.name,
          },
          employee,
          role: { id: role.id, slug: role.slug, name: role.name },
        },
        message: `Role berhasil diubah ke ${role.name}`,
      });
    }

    // Case B: No userId → link existing user or create new user account + assign role
    const schema = z.object({
      email: z.string().email("Email tidak valid"),
      password: z.string().min(8, "Password minimal 8 karakter").optional(),
      roleSlug: z.string().min(1, "Role wajib dipilih"),
    });

    const { email, password, roleSlug } = schema.parse(body);

    // Check if email is already used by another user
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      // Email exists → link to existing user, just assign role
      const role = await db.query.roles.findFirst({
        where: eq(roles.slug, roleSlug),
      });
      if (!role) {
        return c.json({ error: "Role tidak ditemukan" }, 404);
      }

      // Check if already has this role
      const existingRole = await db.query.userRoles.findFirst({
        where: and(
          eq(userRoles.userId, existingUser.id),
          eq(userRoles.roleId, role.id)
        ),
      });
      if (!existingRole) {
        await db.insert(userRoles).values({
          id: createId(),
          userId: existingUser.id,
          roleId: role.id,
        });
      }

      // Link employee to existing user
      const [updatedEmployee] = await db
        .update(employees)
        .set({ userId: existingUser.id, updatedAt: new Date() })
        .where(eq(employees.id, id))
        .returning();

      return c.json({
        success: true,
        data: {
          user: { id: existingUser.id, email: existingUser.email, name: existingUser.name },
          employee: updatedEmployee,
          role: { id: role.id, slug: role.slug, name: role.name },
        },
        message: "Akun sudah ada, role berhasil di-assign",
      }, 201);
    }

    // Email doesn't exist → create new user (password required)
    if (!password) {
      return c.json({ error: "Password wajib diisi untuk membuat akun baru" }, 400);
    }

    const role = await db.query.roles.findFirst({
      where: eq(roles.slug, roleSlug),
    });
    if (!role) {
      return c.json({ error: "Role tidak ditemukan" }, 404);
    }

    const passwordHash = await bcrypt.hash(password, 10);

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

    await db.insert(userRoles).values({
      id: createId(),
      userId: newUser.id,
      roleId: role.id,
    });

    const [updatedEmployee] = await db
      .update(employees)
      .set({ userId: newUser.id, updatedAt: new Date() })
      .where(eq(employees.id, id))
      .returning();

    // Also ensure donatur record exists linked to this user
    const existingDonatur = await db.query.donatur.findFirst({
      where: eq(donatur.email, email),
    });
    if (!existingDonatur) {
      await db.insert(donatur).values({
        id: createId(),
        email,
        name: employee.name,
        phone: employee.phone || null,
        whatsappNumber: employee.whatsappNumber || null,
        website: employee.website || null,
        detailAddress: employee.detailAddress || null,
        provinceCode: employee.provinceCode || null,
        regencyCode: employee.regencyCode || null,
        districtCode: employee.districtCode || null,
        villageCode: employee.villageCode || null,
        nik: employee.nationalId || null,
        npwp: employee.taxId || null,
        userId: newUser.id,
      });
    } else if (!existingDonatur.userId) {
      // Link existing donatur to new user
      await db
        .update(donatur)
        .set({ userId: newUser.id, updatedAt: new Date() })
        .where(eq(donatur.id, existingDonatur.id));
    }

    return c.json({
      success: true,
      data: {
        user: { id: newUser.id, email: newUser.email, name: newUser.name },
        employee: updatedEmployee,
        role: { id: role.id, slug: role.slug, name: role.name },
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
