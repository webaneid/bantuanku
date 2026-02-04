import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export function success<T>(c: Context, data: T, message?: string, status: ContentfulStatusCode = 200) {
  return c.json(
    {
      success: true,
      message,
      data,
    },
    status
  );
}

export function error(c: Context, message: string, status: ContentfulStatusCode = 400, errors?: unknown) {
  return c.json(
    {
      success: false,
      message,
      errors,
    },
    status
  );
}

export function paginated<T>(
  c: Context,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  }
) {
  return c.json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  });
}
