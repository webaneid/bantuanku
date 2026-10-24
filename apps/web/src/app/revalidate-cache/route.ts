import { timingSafeEqual } from 'crypto';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// Dipanggil API (server-ke-server) setelah admin mengubah data publik; lihat arsitektur-cache-performance.md.
// Hanya tag dalam daftar ini yang diterima.
const ALLOWED_TAGS = new Set(['campaigns', 'categories', 'stats', 'qurban', 'pages', 'settings', 'reports', 'zakat']);

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) {
    return NextResponse.json({ success: false, message: 'Revalidate tidak dikonfigurasi' }, { status: 503 });
  }
  if (!secretMatches(request.headers.get('x-revalidate-secret'), expected)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  let tags: unknown;
  try {
    ({ tags } = await request.json());
  } catch {
    return NextResponse.json({ success: false, message: 'Body tidak valid' }, { status: 400 });
  }
  const valid = Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string' && ALLOWED_TAGS.has(t)) : [];
  valid.forEach((tag) => revalidateTag(tag));

  return NextResponse.json({ success: true, revalidated: valid });
}
