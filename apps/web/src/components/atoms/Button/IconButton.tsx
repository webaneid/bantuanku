import React from 'react';
import { cn } from '@/lib/cn';

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'danger'
    | 'warning'
    | 'outline'
    | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon: React.ReactNode;
  'aria-label': string; // Required for accessibility
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'btn',
          'btn-icon',
          `btn-${variant}`,
          `btn-${size}`,
          className
        )}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
