import React from 'react';
import { cn } from '@/lib/cn';

export interface ProgramBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
}

export const ProgramBadge = React.forwardRef<
  HTMLSpanElement,
  ProgramBadgeProps
>(({ label, variant = 'primary', className, children, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn('badge', `badge--${variant}`, className)}
      {...props}
    >
      {children || label}
    </span>
  );
});

ProgramBadge.displayName = 'ProgramBadge';
