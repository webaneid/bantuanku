"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/outline";

export interface AutocompleteOption {
  value: string;
  label: string;
}

interface AutocompleteProps {
  options: AutocompleteOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

export default function Autocomplete({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className = "",
  disabled = false,
  allowClear = true,
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search query
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get selected option label
  const selectedOption = options.find((option) => option.value === value);
  const displayValue = selectedOption ? selectedOption.label : "";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearchQuery("");
    } else if (e.key === "Enter" && filteredOptions.length === 1) {
      handleSelect(filteredOptions[0].value);
    }
  };

  return (
    <div ref={containerRef} className={`autocomplete ${className}`}>
      <div
        className={`autocomplete-input-wrapper ${isOpen ? "open" : ""} ${
          disabled ? "disabled" : ""
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            className="autocomplete-search"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
        ) : (
          <div className="autocomplete-display">
            {displayValue || <span className="autocomplete-placeholder">{placeholder}</span>}
          </div>
        )}

        <div className="autocomplete-icons">
          {allowClear && value && !disabled && (
            <button
              type="button"
              className="autocomplete-clear"
              onClick={handleClear}
              tabIndex={-1}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
          <ChevronDownIcon
            className={`autocomplete-arrow ${isOpen ? "open" : ""}`}
          />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="autocomplete-dropdown">
          {filteredOptions.length > 0 ? (
            <ul className="autocomplete-options">
              {filteredOptions.map((option) => (
                <li
                  key={option.value}
                  className={`autocomplete-option ${
                    option.value === value ? "selected" : ""
                  }`}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          ) : (
            <div className="autocomplete-empty">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}
