'use client';

import { useParams } from 'next/navigation';
import UniversalPaymentInstruction from '@/components/UniversalPaymentInstruction';

export default function PaymentInstructionPage() {
  const params = useParams();

  return <UniversalPaymentInstruction transactionId={params.id as string} />;
}
