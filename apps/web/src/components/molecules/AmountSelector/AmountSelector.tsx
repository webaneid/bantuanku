'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { formatRupiah } from '@/lib/format';
import { Input } from '@/components/atoms';

export interface AmountSelectorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: number;
  onChange?: (amount: number) => void;
  presets?: number[];
  min?: number;
  max?: number;
  label?: string;
  error?: string;
  help?: string;
}

const defaultPresets = [
  10000,    // 10K
  25000,    // 25K
  50000,    // 50K
  100000,   // 100K
  250000,   // 250K
  500000,   // 500K
  1000000,  // 1M
];

export const AmountSelector = React.forwardRef<HTMLDivElement, AmountSelectorProps>(
  (
    {
      value = 0,
      onChange,
      presets = defaultPresets,
      min = 10000,
      max,
      label = 'Jumlah Donasi',
      error,
      help = 'Minimal donasi Rp 10.000',
      className,
      ...props
    },
    ref
  ) => {
    const [customMode, setCustomMode] = useState(false);
    const [customInput, setCustomInput] = useState('');

    useEffect(() => {
      // Check if current value is in presets
      const isPreset = presets.includes(value);
      if (!isPreset && value > 0) {
        setCustomMode(true);
        setCustomInput(value.toString());
      }
    }, [value, presets]);

    const handlePresetClick = (amount: number) => {
      setCustomMode(false);
      setCustomInput('');
      onChange?.(amount);
    };

    const handleCustomClick = () => {
      setCustomMode(true);
      if (!customInput) {
        onChange?.(0);
      }
    };

    const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, ''); // Remove non-digits
      setCustomInput(rawValue);

      const numValue = parseInt(rawValue, 10) || 0;
      onChange?.(numValue);
    };

    const formatPresetLabel = (amount: number): string => {
      if (amount >= 1000000) {
        return `${amount / 1000000}Jt`;
      }
      if (amount >= 1000) {
        return `${amount / 1000}Rb`;
      }
      return formatRupiah(amount);
    };

    return (
      <div ref={ref} className={cn('amount-selector', className)} {...props}>
        {label && <label className="form-label">{label}</label>}

        <div className="amount-selector__grid">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={cn(
                'amount-selector__preset',
                !customMode && value === preset && 'amount-selector__preset--active'
              )}
              onClick={() => handlePresetClick(preset)}
            >
              {formatPresetLabel(preset)}
            </button>
          ))}

          <button
            type="button"
            className={cn(
              'amount-selector__preset',
              customMode && 'amount-selector__preset--active'
            )}
            onClick={handleCustomClick}
          >
            Lainnya
          </button>
        </div>

        {customMode && (
          <div className="amount-selector__custom">
            <div className="amount-selector__custom-input">
              <span className="amount-selector__prefix">Rp</span>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Masukkan nominal"
                value={customInput ? formatRupiah(parseInt(customInput, 10)) : ''}
                onChange={handleCustomInputChange}
                error={!!error}
                autoFocus
              />
            </div>
          </div>
        )}

        {error && <span className="form-error">{error}</span>}
        {help && !error && <span className="form-help">{help}</span>}

        {value > 0 && (
          <div className="amount-selector__summary">
            <span className="text-gray-600">Total:</span>
            <span className="amount-selector__total">Rp {formatRupiah(value)}</span>
          </div>
        )}
      </div>
    );
  }
);

AmountSelector.displayName = 'AmountSelector';
