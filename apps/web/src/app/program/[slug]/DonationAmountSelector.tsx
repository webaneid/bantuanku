'use client';

import { useState, useEffect } from 'react';
import { formatRupiahFull } from '@/lib/format';

interface DonationAmountSelectorProps {
  programType: string;
  pillar?: string;
  onAmountSelect: (amount: number) => void;
  selectedAmount: number;
  onFidyahDataChange?: (data: { personCount: number; dayCount: number }) => void;
}

export default function DonationAmountSelector({
  programType,
  pillar,
  onAmountSelect,
  selectedAmount,
  onFidyahDataChange,
}: DonationAmountSelectorProps) {
  const [recommendedAmounts, setRecommendedAmounts] = useState<number[]>([]);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Fidyah-specific state
  const [fidyahPersonCount, setFidyahPersonCount] = useState<number>(1);
  const [fidyahDayCount, setFidyahDayCount] = useState<number>(1);
  const [fidyahPricePerDay, setFidyahPricePerDay] = useState<number>(0);

  const isFidyah = pillar?.toLowerCase() === 'fidyah';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';
        const response = await fetch(`${API_URL}/settings`);
        const data = await response.json();

        if (data.success && data.data) {
          // Fetch Fidyah price if pillar is Fidyah
          if (isFidyah && data.data.fidyah_amount_per_day) {
            const price = parseInt(data.data.fidyah_amount_per_day);
            setFidyahPricePerDay(price);
            // Calculate initial amount (1 person x 1 day)
            const initialAmount = price * 1 * 1;
            onAmountSelect(initialAmount);
            if (onFidyahDataChange) {
              onFidyahDataChange({ personCount: 1, dayCount: 1 });
            }
          } else {
            // Fetch recommended amounts for non-Fidyah
            const key = programType === 'wakaf'
              ? 'utilities_wakaf_amounts'
              : 'utilities_campaign_amounts';

            const settingValue = data.data[key];

            if (settingValue) {
              const amounts = JSON.parse(settingValue);
              setRecommendedAmounts(amounts);
            } else {
              // Default amounts if not found
              setRecommendedAmounts(
                programType === 'wakaf'
                  ? [100000, 500000, 1000000]
                  : [50000, 100000, 200000]
              );
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        // Use defaults on error
        if (!isFidyah) {
          setRecommendedAmounts(
            programType === 'wakaf'
              ? [100000, 500000, 1000000]
              : [50000, 100000, 200000]
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [programType, isFidyah, pillar]);

  const handleRecommendedClick = (amount: number) => {
    setCustomAmount('');
    onAmountSelect(amount);
  };

  const handleCustomAmountChange = (value: string) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');
    setCustomAmount(numericValue);

    const amount = parseInt(numericValue) || 0;
    onAmountSelect(amount);
  };

  const handleFidyahChange = (personCount: number, dayCount: number) => {
    const calculatedAmount = fidyahPricePerDay * personCount * dayCount;
    setFidyahPersonCount(personCount);
    setFidyahDayCount(dayCount);
    onAmountSelect(calculatedAmount);
    if (onFidyahDataChange) {
      onFidyahDataChange({ personCount, dayCount });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 mb-6">
        <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  // Render Fidyah calculator
  if (isFidyah) {
    return (
      <div className="space-y-4 mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">
          Hitung Fidyah
        </p>

        <div className="space-y-3">
          {/* Person Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jumlah Orang
            </label>
            <input
              type="number"
              min="1"
              value={fidyahPersonCount}
              onChange={(e) => handleFidyahChange(parseInt(e.target.value) || 1, fidyahDayCount)}
              className="w-full py-3 px-4 rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:outline-none transition-all"
              style={{ fontSize: '15px' }}
            />
          </div>

          {/* Day Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jumlah Hari Puasa yang Terlewat
            </label>
            <input
              type="number"
              min="1"
              value={fidyahDayCount}
              onChange={(e) => handleFidyahChange(fidyahPersonCount, parseInt(e.target.value) || 1)}
              className="w-full py-3 px-4 rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:outline-none transition-all"
              style={{ fontSize: '15px' }}
            />
          </div>

          {/* Price per day info */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              Fidyah per hari: <span className="font-semibold">{formatRupiahFull(fidyahPricePerDay)}</span>
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Setara harga 1 mud beras (±0.6 kg)
            </p>
          </div>

          {/* Total Calculation */}
          <div className="p-4 bg-primary-50 border-2 border-primary-500 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700">Total Fidyah:</span>
              <span className="text-xl font-bold text-primary-700">
                {formatRupiahFull(selectedAmount)}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              {fidyahPersonCount} orang × {fidyahDayCount} hari × {formatRupiahFull(fidyahPricePerDay)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render normal donation amount selector
  return (
    <div className="space-y-3 mb-6">
      <p className="text-sm font-medium text-gray-700 mb-3">
        Pilih Nominal {programType === 'wakaf' ? 'Wakaf' : 'Donasi'}
      </p>

      {/* Recommended amounts */}
      {recommendedAmounts.map((amount, index) => (
        <button
          key={index}
          type="button"
          onClick={() => handleRecommendedClick(amount)}
          className={`w-full py-3 px-4 rounded-lg border-2 text-left transition-all ${
            selectedAmount === amount && !customAmount
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300'
          }`}
        >
          <span className="font-semibold mono" style={{ fontSize: '15px' }}>
            {formatRupiahFull(amount)}
          </span>
        </button>
      ))}

      {/* Custom amount */}
      <div>
        <input
          type="text"
          placeholder="Nominal lainnya"
          value={customAmount}
          onChange={(e) => handleCustomAmountChange(e.target.value)}
          className={`w-full py-3 px-4 rounded-lg border-2 transition-all ${
            customAmount
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 bg-white'
          }`}
          style={{ fontSize: '15px' }}
        />
        {customAmount && (
          <p className="mt-2 text-sm text-gray-600">
            {formatRupiahFull(parseInt(customAmount) || 0)}
          </p>
        )}
      </div>
    </div>
  );
}
