'use client';

import { useParams } from 'next/navigation';
import UniversalPaymentMethodSelector from '@/components/UniversalPaymentMethodSelector';

export default function PaymentMethodPage() {
  const params = useParams();

  return <UniversalPaymentMethodSelector transactionId={params.id as string} />;
}
