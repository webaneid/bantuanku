"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: PaginationProps) {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5; // Number of pages to show at once

    if (totalPages <= showPages) {
      // Show all pages if total is less than showPages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate start and end of page range
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust range if at the beginning
      if (currentPage <= 2) {
        end = 4;
      }

      // Adjust range if at the end
      if (currentPage >= totalPages - 1) {
        start = totalPages - 3;
      }

      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push("...");
      }

      // Add page range
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push("...");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page: number | string) => {
    if (typeof page === "number") {
      onPageChange(page);
    }
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination">
      <div className="pagination-info">
        Total transaksi: {totalItems}
      </div>

      <div className="pagination-controls">
        <button
          className="pagination-btn pagination-prev"
          onClick={handlePrevious}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>

        <div className="pagination-numbers">
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              className={`pagination-number ${
                page === currentPage ? "active" : ""
              } ${page === "..." ? "ellipsis" : ""}`}
              onClick={() => handlePageClick(page)}
              disabled={page === "..."}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          className="pagination-btn pagination-next"
          onClick={handleNext}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
