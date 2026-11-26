"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type IndexEntry = {
  slug: string;
  title: string;
  summary: string;
  sections: { id: string; heading: string; text: string }[];
};

type Hit = { slug: string; id: string; title: string; heading: string; snippet: string; score: number };

function search(index: IndexEntry[], query: string): Hit[] {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  if (terms.length === 0) return [];
  const hits: Hit[] = [];
  for (const entry of index) {
    const titleLc = `${entry.title} ${entry.summary}`.toLowerCase();
    for (const section of entry.sections) {
      const headingLc = section.heading.toLowerCase();
      const textLc = section.text.toLowerCase();
      let score = 0;
      let matchedAll = true;
      for (const term of terms) {
        const inTitle = titleLc.includes(term);
        const inHeading = headingLc.includes(term);
        const inText = textLc.includes(term);
        if (!inTitle && !inHeading && !inText) {
          matchedAll = false;
          break;
        }
        score += (inTitle ? 3 : 0) + (inHeading ? 4 : 0) + (inText ? 1 : 0);
      }
      if (!matchedAll) continue;
      const pos = textLc.indexOf(terms[0]);
      const start = pos > 40 ? pos - 40 : 0;
      const snippet = pos >= 0 ? `${start > 0 ? "…" : ""}${section.text.slice(start, start + 110)}…` : "";
      hits.push({ slug: entry.slug, id: section.id, title: entry.title, heading: section.heading, snippet, score });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 8);
}

export default function DocumentationSearch() {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<IndexEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const loading = useRef(false);

  const loadIndex = () => {
    if (index || loading.current) return;
    loading.current = true;
    fetch("/documentation/search-index")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: IndexEntry[]) => setIndex(data))
      .catch(() => {
        setFailed(true);
        loading.current = false;
      });
  };

  const trimmed = query.trim();
  const hits = index && trimmed.length >= 2 ? search(index, trimmed) : [];

  return (
    <div className="mb-4">
      <input
        type="search"
        value={query}
        onFocus={loadIndex}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari di dokumentasi…"
        aria-label="Cari di dokumentasi"
        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:border-primary-500"
      />
      {trimmed.length >= 2 ? (
        <div className="mt-2 space-y-1" role="status">
          {failed ? (
            <p className="text-xs text-gray-500 px-1">Pencarian tidak tersedia saat ini.</p>
          ) : !index ? (
            <p className="text-xs text-gray-500 px-1">Memuat…</p>
          ) : hits.length === 0 ? (
            <p className="text-xs text-gray-500 px-1">Tidak ada hasil untuk “{trimmed}”.</p>
          ) : (
            hits.map((hit) => (
              <Link
                key={`${hit.slug}#${hit.id}`}
                href={`/documentation/${hit.slug}#${hit.id}`}
                onClick={() => setQuery("")}
                className="block rounded-md px-2.5 py-2 hover:bg-light"
              >
                <span className="block text-sm font-medium text-dark">{hit.heading}</span>
                <span className="block text-xs text-primary-700">{hit.title}</span>
                {hit.snippet ? <span className="block text-xs text-gray-500 mt-0.5">{hit.snippet}</span> : null}
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
