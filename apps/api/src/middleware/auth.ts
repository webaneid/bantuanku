import { createMiddleware } from "hono/factory";
import { verifyToken } from "../lib/jwt";
import { error } from "../lib/response";
import type { Env, Variables } from "../types";

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    // Log untuk debugging upload
    if (c.req.path.includes("/media/upload")) {
      console.log("=== UPLOAD REQUEST DEBUG ===");
      console.log("Path:", c.req.path);
      console.log("Method:", c.req.method);
      console.log("Headers:", Object.fromEntries(c.req.raw.headers));
    }

    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Auth failed: No Bearer token", { path: c.req.path, headers: authHeader });
      return error(c, "Unauthorized", 401);
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token, c.env.JWT_SECRET);

    if (!payload) {
      console.log("Auth failed: Invalid token", { path: c.req.path });
      return error(c, "Invalid or expired token", 401);
    }

    console.log("=== Auth Middleware Debug ===");
    console.log("JWT Payload:", payload);
    console.log("Roles from payload:", payload.roles);

    c.set("user", {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      phone: payload.phone,
      whatsappNumber: payload.whatsappNumber,
      roles: payload.roles,
      isDeveloper: Boolean(payload.isDeveloper),
    });

    await next();
  }
);

export const optionalAuthMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = await verifyToken(token, c.env.JWT_SECRET);

      if (payload) {
        c.set("user", {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          phone: payload.phone,
          whatsappNumber: payload.whatsappNumber,
          roles: payload.roles,
          isDeveloper: Boolean(payload.isDeveloper),
        });
      }
    }

    await next();
  }
);

export function requireRole(...roles: string[]) {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return error(c, "Unauthorized", 401);
    }

    console.log("=== Role Check Debug ===");
    console.log("User:", user);
    console.log("User roles:", user.roles);
    console.log("Required roles:", roles);
    console.log("Has role:", user.roles.some((role) => roles.includes(role)));

    const hasRole = user.roles.some((role) => roles.includes(role));

    if (!hasRole) {
      return error(c, "Forbidden", 403);
    }

    await next();
  });
}

export const requireDeveloper = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return error(c, "Unauthorized", 401);
    }

    if (!user.isDeveloper) {
      return error(c, "Forbidden", 403);
    }

    await next();
  }
);

// Aliases for convenience
export const requireAuth = authMiddleware;
export const requireRoles = requireRole;
