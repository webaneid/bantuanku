import React from 'react';
import { cn } from '@/lib/cn';

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'urgent' | 'new';
}

const statusConfig = {
  active: { label: 'Aktif', className: 'badge--active' },
  inactive: { label: 'Tidak Aktif', className: 'badge--inactive' },
  pending: { label: 'Menunggu', className: 'badge--pending' },
  completed: { label: 'Selesai', className: 'badge--completed' },
  urgent: { label: 'Mendesak', className: 'badge--urgent' },
  new: { label: 'Baru', className: 'badge--new' },
};

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, className, children, ...props }, ref) => {
    const config = statusConfig[status];

    return (
      <span
        ref={ref}
        className={cn('badge', config.className, className)}
        {...props}
      >
        {children || config.label}
      </span>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';
