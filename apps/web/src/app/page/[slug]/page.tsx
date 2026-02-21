import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/organisms";
import { getImageUrl } from "@/lib/image";
import { fetchPageBySlug } from "@/services/pages";
import { fetchCampaigns } from "@/services/campaigns";
import { fetchZakatTypes } from "@/services/zakat";
import { fetchActivePeriods, fetchPackagesByPeriod, getAnimalTypeLabel, getQurbanImageUrl } from "@/services/qurban";
import { fetchSeoSettings, generateBreadcrumbJsonLd, resolveOgImageUrl } from "@/lib/seo";

interface StaticPageProps {
  params: Promise<{
    slug: string;
  }>;
}

function getSquareVariantUrl(imageUrl: string): string {
  const [pathname, query = ""] = imageUrl.split("?");
  const squarePath = pathname.replace(/-(thumbnail|medium|large|square|original)\.webp$/i, "-square.webp");
  return query ? `${squarePath}?${query}` : squarePath;
}

function getZakatTypeLabel(calculatorType?: string | null): string {
  switch ((calculatorType || "").toLowerCase()) {
    case "fitrah":
      return "Zakat Fitrah";
    case "maal":
      return "Zakat Maal";
    case "income":
      return "Zakat Penghasilan";
    case "trade":
      return "Zakat Bisnis";
    case "agriculture":
      return "Zakat Pertanian";
    case "livestock":
      return "Zakat Peternakan";
    default:
      return "Jenis Zakat";
  }
}

function sortSidebarCampaigns(items: any[]): any[] {
  return [...items].sort((a, b) => {
    const aGroup = a.isUrgent ? 0 : a.isFeatured ? 1 : 2;
    const bGroup = b.isUrgent ? 0 : b.isFeatured ? 1 : 2;
    if (aGroup !== bGroup) return aGroup - bGroup;

    const aNoDonor = (a.donorCount || 0) === 0 ? 0 : 1;
    const bNoDonor = (b.donorCount || 0) === 0 ? 0 : 1;
    if (aNoDonor !== bNoDonor) return aNoDonor - bNoDonor;

    if ((a.donorCount || 0) !== (b.donorCount || 0)) {
      return (a.donorCount || 0) - (b.donorCount || 0);
    }

    const aCreatedAt = new Date(a.createdAt || 0).getTime();
    const bCreatedAt = new Date(b.createdAt || 0).getTime();
    return bCreatedAt - aCreatedAt;
  });
}

export async function generateMetadata({ params }: StaticPageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const [page, settings] = await Promise.all([
      fetchPageBySlug(slug),
      fetchSeoSettings(),
    ]);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bantuanku.com";
    const siteName = settings.site_name || "Bantuanku";
    const toAbsoluteUrl = (url: string) =>
      url.startsWith("data:") ? "" : url.startsWith("http") ? url : `${appUrl}${url.startsWith("/") ? url : `/${url}`}`;

    // SEO Title: metaTitle > title
    const seoTitle = page.metaTitle || page.title;
    // SEO Description: metaDescription > excerpt > fallback
    const seoDescription = page.metaDescription || page.excerpt || page.title;

    // Canonical URL
    const canonicalUrl = page.canonicalUrl || `${appUrl}/page/${slug}`;

    // OG Image: ogImageUrl > featureImageUrl > site default
    const ogImageUrl = resolveOgImageUrl(
      appUrl,
      [page.ogImageUrl, page.featureImageUrl ? getImageUrl(page.featureImageUrl) : null, settings.og_image],
      "/og-image.jpg"
    );

    // OG Title & Description: ogTitle > metaTitle > title
    const ogTitle = page.ogTitle || seoTitle;
    const ogDescription = page.ogDescription || seoDescription;

    // Robots: respect per-page noIndex/noFollow
    const noIndex = Boolean(page.noIndex);
    const noFollow = Boolean(page.noFollow);

    // Keywords from focusKeyphrase
    const keywords = page.focusKeyphrase
      ? page.focusKeyphrase.split(",").map((k: string) => k.trim()).filter(Boolean)
      : undefined;

    // JSON-LD: Breadcrumb
    const breadcrumbJsonLd = generateBreadcrumbJsonLd([
      { name: "Beranda", url: appUrl },
      { name: page.title, url: `${appUrl}/page/${slug}` },
    ]);

    // JSON-LD: Article
    const orgLogo = settings.organization_logo || settings.og_image || "/logo.svg";
    const articleJsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: seoTitle,
      description: seoDescription,
      ...(ogImageUrl && { image: ogImageUrl }),
      ...(page.publishedAt && { datePublished: page.publishedAt }),
      ...(page.updatedAt && { dateModified: page.updatedAt }),
      author: {
        "@type": "Organization",
        name: siteName,
      },
      publisher: {
        "@type": "Organization",
        name: siteName,
        logo: {
          "@type": "ImageObject",
          url: toAbsoluteUrl(orgLogo),
        },
      },
    };

    return {
      title: seoTitle,
      description: seoDescription,
      keywords,
      alternates: {
        canonical: canonicalUrl,
      },
      robots: {
        index: !noIndex,
        follow: !noFollow,
        googleBot: {
          index: !noIndex,
          follow: !noFollow,
          "max-video-preview": -1,
          "max-image-preview": "large" as const,
          "max-snippet": -1,
        },
      },
      openGraph: {
        type: "website",
        locale: "id_ID",
        url: canonicalUrl,
        siteName,
        title: ogTitle,
        description: ogDescription,
        ...(page.publishedAt && { publishedTime: page.publishedAt }),
        ...(page.updatedAt && { modifiedTime: page.updatedAt }),
        images: ogImageUrl
          ? [{ url: ogImageUrl, width: 1200, height: 630, alt: ogTitle }]
          : undefined,
      },
      twitter: {
        card: "summary_large_image",
        site: settings.twitter_handle || "@bantuanku",
        title: ogTitle,
        description: ogDescription,
        images: ogImageUrl ? [ogImageUrl] : undefined,
      },
    };
  } catch {
    return {
      title: "Halaman",
    };
  }
}

export default async function StaticPage({ params }: StaticPageProps) {
  const { slug } = await params;
  let page: Awaited<ReturnType<typeof fetchPageBySlug>> | null = null;
  let sidebarCampaigns: any[] = [];
  let sidebarZakat: any[] = [];
  let sidebarQurban: any[] = [];

  try {
    page = await fetchPageBySlug(slug);
  } catch {
    notFound();
  }

  try {
    const [campaignsResponse, zakatTypes, periodsResponse] = await Promise.all([
      fetchCampaigns({ status: "active", limit: 100 }),
      fetchZakatTypes(),
      fetchActivePeriods(),
    ]);

    const allCampaigns = Array.isArray(campaignsResponse?.data) ? campaignsResponse.data : [];
    sidebarCampaigns = sortSidebarCampaigns(allCampaigns).slice(0, 5);

    sidebarZakat = (Array.isArray(zakatTypes) ? zakatTypes : [])
      .filter((item: any) => item.isActive)
      .sort((a: any, b: any) => {
        if ((a.displayOrder || 0) !== (b.displayOrder || 0)) {
          return (a.displayOrder || 0) - (b.displayOrder || 0);
        }
        return (a.name || "").localeCompare(b.name || "", "id-ID");
      })
      .slice(0, 5);

    const periods = Array.isArray(periodsResponse?.data) ? periodsResponse.data : [];
    const activePeriod =
      periods.find((period: any) => String(period.status || "").toLowerCase() === "active") || periods[0];

    if (activePeriod?.id) {
      const qurbanPackagesResponse = await fetchPackagesByPeriod(activePeriod.id);
      const packages = Array.isArray(qurbanPackagesResponse?.data) ? qurbanPackagesResponse.data : [];
      sidebarQurban = packages.slice(0, 5);
    }
  } catch (error) {
    console.error("Failed to load sidebar page links:", error);
  }

  if (!page) {
    notFound();
  }

  const featureImage = page.featureImageUrl ? getImageUrl(page.featureImageUrl) : null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bantuanku.com";
  const toAbsoluteUrl = (url: string) =>
    url.startsWith("data:") ? "" : url.startsWith("http") ? url : `${appUrl}${url.startsWith("/") ? url : `/${url}`}`;

  // JSON-LD: Breadcrumb
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Beranda", url: appUrl },
    { name: page.title, url: `${appUrl}/page/${slug}` },
  ]);

  // JSON-LD: WebPage
  let settings: Record<string, any> = {};
  try {
    settings = await fetchSeoSettings();
  } catch {}
  const siteName = settings.site_name || "Bantuanku";
  const rawOgImage = resolveOgImageUrl(
    appUrl,
    [page.ogImageUrl, featureImage ? featureImage : null, settings.og_image],
    "/og-image.jpg"
  );

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.metaTitle || page.title,
    description: page.metaDescription || page.excerpt || page.title,
    url: `${appUrl}/page/${slug}`,
    ...(rawOgImage && { image: rawOgImage }),
    ...(page.publishedAt && { datePublished: page.publishedAt }),
    ...(page.updatedAt && { dateModified: page.updatedAt }),
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: appUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1 bg-gray-50">
          <div className="bg-white border-b border-gray-200">
            <div className="container py-3">
              <nav className="flex items-center gap-2 text-sm text-gray-600">
                <Link href="/" className="hover:text-primary-600">
                  Beranda
                </Link>
                <span>/</span>
                <span className="text-gray-900 font-medium line-clamp-1">{page.title}</span>
              </nav>
            </div>
          </div>

        <div className="container py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <article className="lg:col-span-2 space-y-6">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{page.title}</h1>

              {featureImage && (
                <img
                  src={featureImage}
                  alt={page.title}
                  className="w-full h-auto rounded-lg object-contain"
                />
              )}

              <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
                <div
                  className="prose prose-sm md:prose-base max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: page.content }}
                />
              </div>
            </article>

            <aside className="lg:col-span-1">
              <div className="space-y-4 sticky top-24">
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900">Program Lainnya</h2>
                    <Link href="/program" aria-label="Lihat semua program" className="text-gray-700 hover:text-primary-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
                      </svg>
                    </Link>
                  </div>

                  <div className="pt-2 divide-y divide-gray-100">
                    {sidebarCampaigns.length === 0 ? (
                      <p className="py-3 text-sm text-gray-500">Belum ada program lain.</p>
                    ) : (
                      sidebarCampaigns.map((item: any) => {
                        const imageSquare = getSquareVariantUrl(getImageUrl(item.imageUrl));
                        return (
                          <Link
                            key={item.id}
                            href={`/program/${item.slug}`}
                            className="flex items-start gap-3 py-3 group"
                          >
                            <img
                              src={imageSquare}
                              alt={item.title}
                              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm text-gray-500 capitalize line-clamp-1">
                                {item.categoryName || item.category || "Program"}
                              </p>
                              <h3 className="text-base font-medium text-gray-900 leading-snug line-clamp-2 group-hover:text-primary-600">
                                {item.title}
                              </h3>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900">Zakat Lainnya</h2>
                    <Link href="/zakat" aria-label="Lihat semua zakat" className="text-gray-700 hover:text-primary-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
                      </svg>
                    </Link>
                  </div>

                  <div className="pt-2 divide-y divide-gray-100">
                    {sidebarZakat.length === 0 ? (
                      <p className="py-3 text-sm text-gray-500">Belum ada jenis zakat lain.</p>
                    ) : (
                      sidebarZakat.map((item: any) => {
                        const imageSquare = getSquareVariantUrl(getImageUrl(item.imageUrl));
                        return (
                          <Link
                            key={item.id}
                            href={`/zakat/${item.slug}`}
                            className="flex items-start gap-3 py-3 group"
                          >
                            <img
                              src={imageSquare}
                              alt={item.name}
                              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm text-gray-500 line-clamp-1">
                                {getZakatTypeLabel(item.calculatorType)}
                              </p>
                              <h3 className="text-base font-medium text-gray-900 leading-snug line-clamp-2 group-hover:text-primary-600">
                                {item.name}
                              </h3>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900">Qurban Lainnya</h2>
                    <Link href="/qurban" aria-label="Lihat semua qurban" className="text-gray-700 hover:text-primary-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
                      </svg>
                    </Link>
                  </div>

                  <div className="pt-2 divide-y divide-gray-100">
                    {sidebarQurban.length === 0 ? (
                      <p className="py-3 text-sm text-gray-500">Belum ada paket qurban lain.</p>
                    ) : (
                      sidebarQurban.map((item: any) => {
                        const imageSquare = getSquareVariantUrl(getQurbanImageUrl(item.imageUrl));
                        return (
                          <Link
                            key={item.packagePeriodId || item.id}
                            href={`/qurban/${item.packagePeriodId || item.id}`}
                            className="flex items-start gap-3 py-3 group"
                          >
                            <img
                              src={imageSquare}
                              alt={item.name}
                              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm text-gray-500 line-clamp-1">
                                {getAnimalTypeLabel(item.animalType || "")}
                              </p>
                              <h3 className="text-base font-medium text-gray-900 leading-snug line-clamp-2 group-hover:text-primary-600">
                                {item.name}
                              </h3>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

        <Footer />
      </div>
    </>
  );
}
