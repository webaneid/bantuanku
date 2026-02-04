import React from 'react';
import { cn } from '@/lib/cn';
import { formatRupiah, formatPercentage } from '@/lib/format';

export interface ProgressBarProps {
  current: number;
  target: number;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showAmount?: boolean;
  showPercentage?: boolean;
  striped?: boolean;
  animated?: boolean;
  className?: string;
}

export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      current,
      target,
      variant = 'default',
      size = 'md',
      showLabel = true,
      showAmount = true,
      showPercentage = true,
      striped = false,
      animated = false,
      className,
    },
    ref
  ) => {
    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const percentageFormatted = formatPercentage(current, target);

    return (
      <div ref={ref} className={cn('progress-wrapper', className)}>
        <div
          className={cn(
            'progress',
            `progress--${variant}`,
            `progress--${size}`,
            striped && 'progress--striped',
            striped && animated && 'progress--animated'
          )}
        >
          <div
            className="progress__bar"
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={current}
            aria-valuemin={0}
            aria-valuemax={target}
            aria-label={`Progress: ${percentageFormatted}`}
          />
        </div>

        {showLabel && (showAmount || showPercentage) && (
          <div className="progress__label">
            {showAmount && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Terkumpul:</span>
                <span className="font-semibold mono">
                  Rp {formatRupiah(current)}
                </span>
                <span className="text-sm text-gray-400">/</span>
                <span className="text-sm text-gray-600 mono">
                  Rp {formatRupiah(target)}
                </span>
              </div>
            )}
            {showPercentage && (
              <span className="percentage font-semibold">
                {percentageFormatted}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';
