'use client';

import { useState } from 'react';
import { depositSavings } from '@/services/qurban-savings';

export default function DepositForm({
  savingsId,
  onSuccess
}: {
  savingsId: string;
  onSuccess?: () => void | Promise<void>;
}) {
  const [amount, setAmount] = useState(0);
  const [paymentProof, setPaymentProof] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await depositSavings(savingsId, {
        amount,
        paymentMethod: 'bank_transfer',
        paymentChannel: 'BCA',
        paymentProof,
        notes,
      });
      alert('Setoran berhasil, menunggu verifikasi admin');
      if (onSuccess) {
        await onSuccess();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to deposit:', error);
      alert('Gagal melakukan setoran');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nominal Setoran
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
          Link Bukti Transfer
        </label>
        <input
          type="url"
          value={paymentProof}
          onChange={(e) => setPaymentProof(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Catatan (Opsional)
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
        Setor Sekarang
      </button>
    </form>
  );
}
