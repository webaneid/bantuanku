import Link from "next/link";
import { getDocumentationManifest, getDocumentationPageBySlug } from "@/lib/documentation";

type DocumentationViewProps = {
  slug: string;
};

export default function DocumentationView({ slug }: DocumentationViewProps) {
  const manifest = getDocumentationManifest();
  const page = getDocumentationPageBySlug(slug);

  if (!page) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8 md:py-10">
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 mb-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-webane.svg"
              alt="Webane Indonesia"
              className="h-9 w-auto"
            />
            <div>
              <h1 className="text-lg md:text-xl font-semibold text-gray-900">
                Dokumentasi Bantuanku
              </h1>
              <p className="text-sm text-gray-500">Panduan operasional aplikasi</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <aside className="xl:col-span-3">
            <div className="bg-white border border-gray-200 rounded-xl p-4 sticky top-6">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">
                Menu Dokumentasi
              </p>
              <div className="space-y-3">
                {manifest.categories.map((category) => {
                  const isCurrentGroup = category.items.some((item) => item.slug === slug);
                  return (
                    <details key={category.id} open={isCurrentGroup} className="group">
                      <summary className="cursor-pointer list-none text-sm font-medium text-gray-900 pb-2 border-b border-gray-100">
                        {category.label}
                      </summary>
                      <div className="pt-2 space-y-1">
                        {category.items.map((item) => {
                          const active = item.slug === slug;
                          return (
                            <Link
                              key={item.slug}
                              href={`/documentation/${item.slug}`}
                              className={`block rounded-md px-2.5 py-2 text-sm transition-colors ${active
                                  ? "bg-primary-50 text-primary-700 font-medium"
                                  : "text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                              {item.title}
                            </Link>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          </aside>

          <article className="xl:col-span-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-7">
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">{page.title}</h2>
              {page.summary ? (
                <p className="text-gray-600 mt-2">{page.summary}</p>
              ) : null}
              <p className="text-xs text-gray-500 mt-2">Update: {page.updatedAt}</p>

              <div className="mt-8 space-y-8">
                {page.sections.map((section) => (
                  <section key={section.id} id={section.id} className="scroll-mt-24">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{section.heading}</h3>
                    <div
                      className="prose prose-sm md:prose-base max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{ __html: section.bodyHtml }}
                    />
                  </section>
                ))}
              </div>
            </div>
          </article>

          <aside className="hidden xl:block xl:col-span-3">
            <div className="bg-white border border-gray-200 rounded-xl p-4 sticky top-6">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">
                Di Halaman Ini
              </p>
              <div className="space-y-1">
                {page.sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block text-sm text-gray-700 hover:text-primary-700 py-1"
                  >
                    {section.heading}
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
