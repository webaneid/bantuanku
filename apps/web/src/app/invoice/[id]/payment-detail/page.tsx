'use client';

import { useParams } from 'next/navigation';
import UniversalPaymentDetailSelector from '@/components/UniversalPaymentDetailSelector';

export default function PaymentDetailPage() {
  const params = useParams();

  return <UniversalPaymentDetailSelector transactionId={params.id as string} />;
}
