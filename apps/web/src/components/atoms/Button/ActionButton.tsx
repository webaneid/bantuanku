import React from 'react';
import { cn } from '@/lib/cn';

export interface ActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  action: 'view' | 'edit' | 'delete';
  icon: React.ReactNode;
  'aria-label': string; // Required for accessibility
}

export const ActionButton = React.forwardRef<
  HTMLButtonElement,
  ActionButtonProps
>(({ action, icon, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn('action-btn', `action-btn-${action}`, className)}
      {...props}
    >
      {icon}
    </button>
  );
});

ActionButton.displayName = 'ActionButton';
