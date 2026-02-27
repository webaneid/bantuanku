'use client';

import { useState } from 'react';

interface TitipanRow {
  id: string;
  paidAt: string | null;
  programName: string;
  zakatTypeName: string;
  periodName: string;
  donorName: string | null;
  amount: number;
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID').format(amount || 0);
}

const ITEMS_PER_PAGE = 10;

export default function ZakatTitipanTable({ rows }: { rows: TitipanRow[] }) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(rows.length / ITEMS_PER_PAGE);
  const paginatedRows = rows.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <>
      {/* Desktop Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>Mitra/Program</th>
              <th>Jenis Zakat</th>
              <th>Periode</th>
              <th>Muzakki</th>
              <th>Nominal</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, index) => (
              <tr key={row.id}>
                <td>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                <td>{row.paidAt ? new Date(row.paidAt).toLocaleString('id-ID') : '-'}</td>
                <td>{row.programName}</td>
                <td>{row.zakatTypeName}</td>
                <td>{row.periodName}</td>
                <td>{row.donorName || 'Hamba Allah'}</td>
                <td className="mono">Rp {formatRupiah(row.amount)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={7}>
                  Belum ada data pada filter ini
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="table-mobile-cards">
        {paginatedRows.map((row, index) => (
          <div key={row.id} className="table-card">
            <div className="table-card-header">
              <div className="table-card-header-left">
                <div className="table-card-header-title">{row.donorName || 'Hamba Allah'}</div>
                <div className="table-card-header-subtitle">{row.programName}</div>
              </div>
              <span className="table-card-header-badge bg-success-50 text-success-700">
                #{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
              </span>
            </div>
            <div className="table-card-row">
              <span className="table-card-row-label">Tanggal</span>
              <span className="table-card-row-value">
                {row.paidAt ? new Date(row.paidAt).toLocaleString('id-ID') : '-'}
              </span>
            </div>
            <div className="table-card-row">
              <span className="table-card-row-label">Jenis Zakat</span>
              <span className="table-card-row-value">{row.zakatTypeName}</span>
            </div>
            <div className="table-card-row">
              <span className="table-card-row-label">Periode</span>
              <span className="table-card-row-value">{row.periodName}</span>
            </div>
            <div className="table-card-row">
              <span className="table-card-row-label">Nominal</span>
              <span className="table-card-row-value mono">Rp {formatRupiah(row.amount)}</span>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Belum ada data pada filter ini
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination__btn pagination__btn--prev"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <svg className="pagination__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="pagination__text">Sebelumnya</span>
          </button>

          <div className="pagination__numbers">
            {getPageNumbers().map((page, index) => (
              typeof page === 'number' ? (
                <button
                  key={index}
                  className={`pagination__number ${currentPage === page ? 'pagination__number--active' : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ) : (
                <span key={index} className="pagination__ellipsis">
                  {page}
                </span>
              )
            ))}
          </div>

          <button
            className="pagination__btn pagination__btn--next"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <span className="pagination__text">Selanjutnya</span>
            <svg className="pagination__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
