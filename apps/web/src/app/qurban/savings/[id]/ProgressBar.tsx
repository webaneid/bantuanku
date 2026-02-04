import { formatCurrency } from '@/lib/format';

export default function ProgressBar({ current, target }: { current: number; target: number }) {
  const progress = (current / target) * 100;
  const remaining = target - current;

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Progress Tabungan</span>
          <span className="text-sm font-semibold text-green-600">{progress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-green-600 h-4 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-gray-500 mb-1">Target</p>
          <p className="font-semibold text-gray-900">{formatCurrency(target)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Terkumpul</p>
          <p className="font-semibold text-green-600">{formatCurrency(current)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Kurang</p>
          <p className="font-semibold text-orange-600">{formatCurrency(remaining)}</p>
        </div>
      </div>
    </div>
  );
}
