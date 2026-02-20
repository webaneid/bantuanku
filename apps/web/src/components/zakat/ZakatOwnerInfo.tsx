import { getImageUrl } from '@/lib/image';

interface ZakatOwnerInfoProps {
  owner?: {
    type?: "organization" | "mitra";
    name?: string | null;
    logoUrl?: string | null;
    slug?: string | null;
  };
}

export default function ZakatOwnerInfo({ owner }: ZakatOwnerInfoProps) {
  if (!owner?.name) return null;

  const isMitra = owner.type === "mitra";
  const logoUrl = getImageUrl(owner.logoUrl, "/logo.svg");
  const wrapperClassName = isMitra && owner.slug
    ? "mb-6 inline-flex flex-col items-start gap-2 rounded-lg -mx-2 px-2 py-2 hover:bg-gray-50 transition-colors"
    : "mb-6 inline-flex flex-col items-start gap-2";

  const content = (
    <div className={wrapperClassName}>
      <div className="max-w-[30%]">
        <img
          src={logoUrl}
          alt={owner.name}
          className="w-full h-auto object-contain"
        />
      </div>

      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-gray-900">{owner.name}</span>
        {isMitra && (
          <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </div>
  );

  if (isMitra && owner.slug) {
    return (
      <a href={`/mitra/${owner.slug}`} className="block">
        {content}
      </a>
    );
  }

  return <>{content}</>;
}
