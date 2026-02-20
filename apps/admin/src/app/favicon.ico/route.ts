import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:50245/v1";

function toAbsoluteUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  const apiBase = API_URL.replace(/\/v1\/?$/, "");
  return new URL(pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`, apiBase).toString();
}

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/settings`, { cache: "no-store" });
    if (response.ok) {
      const payload = await response.json();
      const settings = payload?.data ?? payload ?? {};
      const favicon = settings.organization_favicon || settings.organization_logo;

      if (typeof favicon === "string" && favicon.trim().length > 0) {
        return NextResponse.redirect(toAbsoluteUrl(favicon), 307);
      }
    }
  } catch {
    // ignore and fall back to empty response
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}
