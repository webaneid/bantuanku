"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDownIcon, XMarkIcon, LinkIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { fetchAllURLs, type URLOption } from "@/lib/url-registry";

interface URLAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function URLAutocomplete({
  value,
  onChange,
  placeholder = "Pilih atau ketik URL...",
  className = "",
  disabled = false,
}: URLAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [urlOptions, setUrlOptions] = useState<URLOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper to detect external URL
  const isExternalURL = (url: string) => {
    return url.startsWith('http://') || url.startsWith('https://');
  };

  // Helper to validate URL format
  const isValidURL = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Fetch URLs on mount
  useEffect(() => {
    const loadURLs = async () => {
      setIsLoading(true);
      const urls = await fetchAllURLs();
      setUrlOptions(urls);
      setIsLoading(false);
    };

    loadURLs();
  }, []);

  // Filter options based on search query
  const filteredOptions = urlOptions.filter((option) => {
    const query = searchQuery.toLowerCase();
    return (
      option.value.toLowerCase().includes(query) ||
      option.label.toLowerCase().includes(query) ||
      option.description?.toLowerCase().includes(query)
    );
  });

  // Group options by category
  const groupedOptions = filteredOptions.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = [];
    }
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, URLOption[]>);

  // Get selected option label
  const selectedOption = urlOptions.find((option) => option.value === value);
  const displayValue = selectedOption ? selectedOption.label : value;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // If user typed a valid external URL, save it
        if (searchQuery && isExternalURL(searchQuery) && isValidURL(searchQuery)) {
          onChange(searchQuery);
        }
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchQuery, onChange]);

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
    } else if (e.key === "Enter") {
      // If user typed external URL, use it
      if (searchQuery && isExternalURL(searchQuery) && isValidURL(searchQuery)) {
        onChange(searchQuery);
        setIsOpen(false);
        setSearchQuery("");
      }
      // If only one option in dropdown, select it
      else if (filteredOptions.length === 1) {
        handleSelect(filteredOptions[0].value);
      }
      // If search query matches internal path format (starts with /), use it
      else if (searchQuery && searchQuery.startsWith('/')) {
        onChange(searchQuery);
        setIsOpen(false);
        setSearchQuery("");
      }
    }
  };

  const categoryOrder = ['Static', 'Program', 'Kategori', 'Pilar', 'Zakat', 'Qurban'];
  const sortedCategories = Object.keys(groupedOptions).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className={`
          relative w-full px-3 py-2 border rounded-lg cursor-pointer transition-all
          ${isOpen ? "border-primary-500 ring-2 ring-primary-100" : "border-gray-300"}
          ${disabled ? "bg-gray-50 cursor-not-allowed" : "bg-white hover:border-gray-400"}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            className="w-full outline-none bg-transparent"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
        ) : (
          <div className="flex items-center gap-2">
            {value && isExternalURL(value) ? (
              <ArrowTopRightOnSquareIcon className="w-4 h-4 text-blue-500" />
            ) : (
              <LinkIcon className="w-4 h-4 text-gray-400" />
            )}
            {displayValue ? (
              <span className="text-sm flex items-center gap-1">
                {displayValue}
                {value && isExternalURL(value) && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    Eksternal
                  </span>
                )}
              </span>
            ) : (
              <span className="text-gray-400 text-sm">{placeholder}</span>
            )}
          </div>
        )}

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              onClick={handleClear}
              tabIndex={-1}
            >
              <XMarkIcon className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <ChevronDownIcon
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {/* Show external URL hint if user is typing external URL */}
          {searchQuery && isExternalURL(searchQuery) && (
            <div className={`px-3 py-2 border-b ${isValidURL(searchQuery) ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="flex items-start gap-2">
                <ArrowTopRightOnSquareIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isValidURL(searchQuery) ? 'text-green-600' : 'text-yellow-600'}`} />
                <div className="flex-1 text-xs">
                  {isValidURL(searchQuery) ? (
                    <>
                      <p className="text-green-800 font-medium">URL Eksternal Valid</p>
                      <p className="text-green-700 mt-0.5">Tekan <kbd className="px-1 py-0.5 bg-white border rounded text-xs font-mono">Enter</kbd> untuk menggunakan URL ini</p>
                    </>
                  ) : (
                    <>
                      <p className="text-yellow-800 font-medium">URL Tidak Valid</p>
                      <p className="text-yellow-700 mt-0.5">Pastikan URL dimulai dengan http:// atau https://</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="px-3 py-8 text-center text-gray-500 text-sm">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mb-2"></div>
              <p>Memuat URL...</p>
            </div>
          ) : filteredOptions.length > 0 ? (
            <div className="py-1">
              {sortedCategories.map((category) => (
                <div key={category}>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 sticky top-0">
                    {category}
                  </div>
                  <ul>
                    {groupedOptions[category].map((option) => (
                      <li
                        key={option.value}
                        className={`
                          px-3 py-2 cursor-pointer transition-colors hover:bg-gray-50
                          ${option.value === value ? "bg-primary-50 text-primary-700" : ""}
                        `}
                        onClick={() => handleSelect(option.value)}
                      >
                        <div className="flex items-start gap-2">
                          <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {option.label}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {option.value}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-8 text-center text-gray-500 text-sm">
              <LinkIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>Tidak ada URL yang cocok</p>
              {searchQuery && !isExternalURL(searchQuery) && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-left">
                  <p className="text-xs text-gray-600 mb-1">💡 Tips:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• URL internal: ketik <code className="px-1 bg-white rounded">/path</code> lalu Enter</li>
                    <li>• URL eksternal: ketik <code className="px-1 bg-white rounded">https://...</code> lalu Enter</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
