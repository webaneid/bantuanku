import React, { useId } from 'react';
import { cn } from '@/lib/cn';

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    if (label) {
      return (
        <div className={cn('form-checkbox', className)}>
          <input
            ref={ref}
            type="checkbox"
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
        type="checkbox"
        id={inputId}
        className={className}
        {...props}
      />
    );
  }
);

Checkbox.displayName = 'Checkbox';
