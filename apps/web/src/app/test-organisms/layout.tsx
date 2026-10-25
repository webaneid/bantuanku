import { I18nNamespaces } from '@/lib/i18n/I18nNamespaces';
import { notFound } from 'next/navigation';

export default function TestOrganismsLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }
  return <I18nNamespaces names={['home']}>{children}</I18nNamespaces>;
}
