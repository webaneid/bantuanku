import { notFound } from 'next/navigation';

export default function TestOrganismsLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }
  return <>{children}</>;
}
