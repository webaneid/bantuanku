import React from 'react';
import { cn } from '@/lib/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'accent'
    | 'gray';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  outline?: boolean;
  icon?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      dot = false,
      outline = false,
      icon,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          'badge',
          `badge--${variant}`,
          `badge--${size}`,
          dot && 'badge--dot',
          outline && 'badge--outline',
          className
        )}
        {...props}
      >
        {icon && icon}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
