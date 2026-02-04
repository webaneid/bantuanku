/**
 * Autocomplete Component
 *
 * A simple autocomplete/select component for selecting from a list of options.
 * Supports filtering by typing.
 */

import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface AutocompleteProps<T> {
  options: T[];
  value: T | null;
  onChange: (value: T | null) => void;
  getOptionLabel: (option: T) => string;
  getOptionValue: (option: T) => string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function Autocomplete<T>({
  options,
  value,
  onChange,
  getOptionLabel,
  getOptionValue,
  placeholder = "Pilih...",
  disabled = false,
  required = false,
  className = "",
}: AutocompleteProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const updatePosition = () => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setDropdownPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
          });
        }
      };

      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen]);

  // Filter options based on search
  const filteredOptions = options.filter((option) =>
    getOptionLabel(option).toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (option: T) => {
    onChange(option);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearch("");
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true);
      inputRef.current?.focus();
    }
  };

  const displayValue = value ? getOptionLabel(value) : "";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input Display */}
      <div
        className={`
          flex items-center gap-2 px-3 py-2 border rounded-md bg-white cursor-pointer
          ${disabled ? "bg-gray-50 cursor-not-allowed" : "hover:border-gray-400"}
          ${isOpen ? "border-primary-500 ring-2 ring-primary-100" : "border-gray-300"}
        `}
        onClick={handleInputClick}
      >
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : displayValue}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="flex-1 outline-none bg-transparent disabled:cursor-not-allowed"
        />

        <div className="flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
              tabIndex={-1}
            >
              <XMarkIcon className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <ChevronDownIcon
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isOpen ? "transform rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Dropdown Options */}
      {isOpen && !disabled && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            marginTop: '4px',
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
              const optionValue = getOptionValue(option);
              const optionLabel = getOptionLabel(option);
              const isSelected = value && getOptionValue(value) === optionValue;

              return (
                <div
                  key={optionValue}
                  onClick={() => handleSelect(option)}
                  className={`
                    px-3 py-2 cursor-pointer transition-colors
                    ${isSelected ? "bg-primary-50 text-primary-700 font-medium" : "hover:bg-gray-50"}
                  `}
                >
                  {optionLabel}
                </div>
              );
            })
          ) : (
            <div className="px-3 py-2 text-gray-500 text-sm">
              {search ? `Tidak ditemukan "${search}"` : "Tidak ada data"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
