import { formatCurrency, formatDateTime } from '@/lib/format';
import { SavingsTransaction } from '@/services/qurban-savings';

export default function TransactionList({ transactions }: { transactions: SavingsTransaction[] }) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    verified: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    pending: 'Menunggu Verifikasi',
    verified: 'Terverifikasi',
    rejected: 'Ditolak',
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Belum ada transaksi setoran
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.map((tx) => (
        <div key={tx.id} className="border rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs text-gray-500">{tx.transactionNumber}</p>
              <p className="font-semibold text-lg">{formatCurrency(tx.amount)}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${statusColors[tx.status]}`}>
              {statusLabels[tx.status]}
            </span>
          </div>
          <p className="text-xs text-gray-500">{formatDateTime(tx.createdAt)}</p>
          {tx.notes && (
            <p className="text-sm text-gray-600 mt-2">{tx.notes}</p>
          )}
          {tx.verifiedAt && (
            <p className="text-xs text-green-600 mt-2">
              Diverifikasi: {formatDateTime(tx.verifiedAt)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
