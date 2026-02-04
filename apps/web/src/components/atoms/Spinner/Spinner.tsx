import React from 'react';
import { cn } from '@/lib/cn';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'gray';
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
};

const colorClasses = {
  primary: 'border-primary-500 border-t-transparent',
  white: 'border-white border-t-transparent',
  gray: 'border-gray-500 border-t-transparent',
};

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', color = 'primary', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-block rounded-full animate-spin',
          sizeClasses[size],
          colorClasses[color],
          className
        )}
        role="status"
        aria-label="Loading"
        {...props}
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';
