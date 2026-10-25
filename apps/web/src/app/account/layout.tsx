import { I18nNamespaces } from '@/lib/i18n/I18nNamespaces';
import AccountLayoutClient from './AccountLayoutClient';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nNamespaces names={['account']}>
      <AccountLayoutClient>{children}</AccountLayoutClient>
    </I18nNamespaces>
  );
}
