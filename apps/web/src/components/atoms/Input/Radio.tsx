import React, { useId } from 'react';
import { cn } from '@/lib/cn';

export interface RadioProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

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
