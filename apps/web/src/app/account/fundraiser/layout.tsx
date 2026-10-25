import { QueryProvider } from '@/components/QueryProvider';

export default function FundraiserLayout({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
