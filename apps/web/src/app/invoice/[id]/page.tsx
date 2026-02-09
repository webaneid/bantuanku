'use client';

import { useParams } from 'next/navigation';
import UniversalInvoice from '@/components/UniversalInvoice';

export default function InvoicePage() {
  const params = useParams();

  return <UniversalInvoice transactionId={params.id as string} />;
}
