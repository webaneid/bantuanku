import { I18nNamespaces } from '@/lib/i18n/I18nNamespaces';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <I18nNamespaces names={['checkout', 'keranjang', 'auth', 'payment']}>{children}</I18nNamespaces>;
}
