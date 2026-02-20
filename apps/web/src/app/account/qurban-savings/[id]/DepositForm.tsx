'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { depositSavings } from '@/services/qurban-savings';
import toast from '@/lib/feedback-toast';
import { useI18n } from '@/lib/i18n/provider';

export default function DepositForm({
  savingsId,
  defaultAmount,
  onSuccess
}: {
  savingsId: string;
  defaultAmount?: number;
  onSuccess?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [amount, setAmount] = useState(defaultAmount || 0);
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || amount <= 0) {
      toast.error(t('account.qurbanSavingsDetail.form.validationAmount'));
      return;
    }

    try {
      const deposit = await depositSavings(savingsId, {
        amount,
        notes,
      });

      const transactionId = deposit.transactionId;
      if (!transactionId) {
        throw new Error('transaction_id_not_found');
      }

      if (onSuccess) {
        await onSuccess();
      }

      toast.success(t('account.qurbanSavingsDetail.form.success'));
      router.push(`/invoice/${transactionId}/payment-method`);
    } catch (error) {
      console.error('Failed to deposit:', error);
      toast.error(t('account.qurbanSavingsDetail.form.failed'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('account.qurbanSavingsDetail.form.amount')}
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full border rounded-lg px-4 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('account.qurbanSavingsDetail.form.notes')}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
          rows={3}
        />
      </div>

      <button
        type="submit"
        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
      >
        {t('account.qurbanSavingsDetail.form.submit')}
      </button>
    </form>
  );
}
