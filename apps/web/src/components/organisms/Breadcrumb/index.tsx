import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container py-3">
        <nav className="flex items-center gap-2 text-sm text-gray-600">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <span key={index} className="flex items-center gap-2">
                {index > 0 && <span>/</span>}
                {isLast || !item.href ? (
                  <span className="text-gray-900 font-medium line-clamp-1">
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} className="hover:text-primary-600">
                    {item.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
