import React from 'react';
import { cn } from '@/lib/cn';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  success?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, success, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'form-select',
          error && 'form-input--error',
          success && 'form-input--success',
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';
