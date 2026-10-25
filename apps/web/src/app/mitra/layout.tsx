import { I18nNamespaces } from '@/lib/i18n/I18nNamespaces';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <I18nNamespaces names={['home']}>{children}</I18nNamespaces>;
}
