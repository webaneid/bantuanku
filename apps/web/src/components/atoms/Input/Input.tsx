import React from 'react';
import { cn } from '@/lib/cn';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, success, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'form-input',
          error && 'form-input--error',
          success && 'form-input--success',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
