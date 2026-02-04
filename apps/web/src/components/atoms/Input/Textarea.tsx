import React from 'react';
import { cn } from '@/lib/cn';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  success?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, success, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'form-textarea',
          error && 'form-input--error',
          success && 'form-input--success',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
