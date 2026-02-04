import React from 'react';
import { cn } from '@/lib/cn';

export interface RadioProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;

    if (label) {
      return (
        <div className={cn('form-radio', className)}>
          <input
            ref={ref}
            type="radio"
            id={inputId}
            {...props}
          />
          <label htmlFor={inputId}>{label}</label>
        </div>
      );
    }

    return (
      <input
        ref={ref}
        type="radio"
        id={inputId}
        className={className}
        {...props}
      />
    );
  }
);

Radio.displayName = 'Radio';
