'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';

export interface SearchBoxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  onSearch?: (query: string) => void;
  onClear?: () => void;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled';
  showClearButton?: boolean;
  debounceMs?: number;
}

export const SearchBox = React.forwardRef<HTMLInputElement, SearchBoxProps>(
  (
    {
      onSearch,
      onClear,
      loading = false,
      size = 'md',
      variant = 'default',
      showClearButton = true,
      debounceMs = 300,
      placeholder = 'Cari...',
      className,
      value: controlledValue,
      onChange,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout>();
    const inputRef = useRef<HTMLInputElement>(null);

    // Use controlled or uncontrolled value
    const value = controlledValue !== undefined ? controlledValue : internalValue;
    const isControlled = controlledValue !== undefined;

    useEffect(() => {
      return () => {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
      };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      if (!isControlled) {
        setInternalValue(newValue);
      }

      onChange?.(e);

      // Debounce search callback
      if (onSearch && debounceMs > 0) {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = setTimeout(() => {
          onSearch(newValue);
        }, debounceMs);
      } else if (onSearch) {
        onSearch(newValue);
      }
    };

    const handleClear = () => {
      if (!isControlled) {
        setInternalValue('');
      }

      if (onClear) {
        onClear();
      } else if (onSearch) {
        onSearch('');
      }

      // Focus input after clear
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape' && value) {
        handleClear();
      }
      props.onKeyDown?.(e);
    };

    return (
      <div
        className={cn(
          'search-box',
          `search-box--${size}`,
          `search-box--${variant}`,
          isFocused && 'search-box--focused',
          loading && 'search-box--loading',
          className
        )}
      >
        <div className="search-box__icon">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <input
          ref={(node) => {
            // Handle both refs
            if (ref) {
              if (typeof ref === 'function') {
                ref(node);
              } else {
                ref.current = node;
              }
            }
            // @ts-ignore
            inputRef.current = node;
          }}
          type="search"
          className="search-box__input"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          {...props}
        />

        {loading && (
          <div className="search-box__spinner">
            <svg
              className="animate-spin"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="8"
                cy="8"
                r="7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="32"
                strokeDashoffset="24"
              />
            </svg>
          </div>
        )}

        {showClearButton && value && !loading && (
          <button
            type="button"
            className="search-box__clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 4L4 12M4 4l8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

SearchBox.displayName = 'SearchBox';
