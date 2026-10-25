import { I18nNamespaces } from '@/lib/i18n/I18nNamespaces';

export default function InvoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <I18nNamespaces names={['invoice', 'payment']}>
      <div className="min-h-screen bg-light">
        {children}
      </div>
    </I18nNamespaces>
  );
}
