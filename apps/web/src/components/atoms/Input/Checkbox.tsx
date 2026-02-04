import React from 'react';
import { cn } from '@/lib/cn';

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

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
