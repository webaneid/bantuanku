import { type ClassValue, clsx } from 'clsx';

/**
 * Utility function to merge class names with clsx
 * Usage: cn('btn', 'btn-primary', isActive && 'active')
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
