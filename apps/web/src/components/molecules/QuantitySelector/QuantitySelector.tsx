import React from 'react';
import { cn } from '@/lib/cn';

export interface QuantitySelectorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'filled';
  label?: string;
  showInput?: boolean;
  disabled?: boolean;
}

export const QuantitySelector = React.forwardRef<HTMLDivElement, QuantitySelectorProps>(
  (
    {
      value,
      onChange,
      min = 1,
      max = 99,
      step = 1,
      size = 'md',
      variant = 'default',
      label,
      showInput = true,
      disabled = false,
      className,
      ...props
    },
    ref
  ) => {
    const handleIncrement = () => {
      if (disabled) return;
      const newValue = Math.min(value + step, max);
      if (newValue !== value) {
        onChange?.(newValue);
      }
    };

    const handleDecrement = () => {
      if (disabled) return;
      const newValue = Math.max(value - step, min);
      if (newValue !== value) {
        onChange?.(newValue);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const newValue = parseInt(e.target.value, 10);
      if (!isNaN(newValue)) {
        const clampedValue = Math.max(min, Math.min(newValue, max));
        onChange?.(clampedValue);
      }
    };

    const handleInputBlur = () => {
      // Ensure value is within bounds on blur
      if (value < min) {
        onChange?.(min);
      } else if (value > max) {
        onChange?.(max);
      }
    };

    const isMinReached = value <= min;
    const isMaxReached = value >= max;

    return (
      <div
        ref={ref}
        className={cn('quantity-selector-wrapper', disabled && 'quantity-selector-wrapper--disabled', className)}
        {...props}
      >
        {label && <label className="quantity-selector__label">{label}</label>}

        <div
          className={cn(
            'quantity-selector',
            `quantity-selector--${size}`,
            `quantity-selector--${variant}`,
            disabled && 'quantity-selector--disabled'
          )}
        >
          <button
            type="button"
            className={cn(
              'quantity-selector__button',
              'quantity-selector__button--minus',
              isMinReached && 'quantity-selector__button--disabled'
            )}
            onClick={handleDecrement}
            disabled={disabled || isMinReached}
            aria-label="Kurangi jumlah"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {showInput ? (
            <input
              type="number"
              className="quantity-selector__input"
              value={value}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
              aria-label="Jumlah"
            />
          ) : (
            <span className="quantity-selector__value">{value}</span>
          )}

          <button
            type="button"
            className={cn(
              'quantity-selector__button',
              'quantity-selector__button--plus',
              isMaxReached && 'quantity-selector__button--disabled'
            )}
            onClick={handleIncrement}
            disabled={disabled || isMaxReached}
            aria-label="Tambah jumlah"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {(isMinReached || isMaxReached) && (
          <span className="quantity-selector__hint">
            {isMinReached && `Minimal: ${min}`}
            {isMaxReached && `Maksimal: ${max}`}
          </span>
        )}
      </div>
    );
  }
);

QuantitySelector.displayName = 'QuantitySelector';
