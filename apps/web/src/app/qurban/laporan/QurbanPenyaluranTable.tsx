'use client';

import { useState } from 'react';

interface DisbursementRow {
  id: string;
  disbursementNumber: string;
  recipientName: string;
  category: string | null;
  amount: number;
  paidAt: string | null;
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID').format(amount || 0);
}

const ITEMS_PER_PAGE = 10;

export default function QurbanPenyaluranTable({ rows, totalDisbursed }: { rows: DisbursementRow[]; totalDisbursed: number }) {
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
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
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
              <th>No. Penyaluran</th>
              <th>Penerima</th>
              <th>Kategori</th>
              <th>Nominal</th>
              <th>Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((d, i) => (
              <tr key={d.id}>
                <td>{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                <td>{d.disbursementNumber}</td>
                <td>{d.recipientName}</td>
                <td>{d.category || '-'}</td>
                <td className="mono">Rp {formatRupiah(d.amount)}</td>
                <td>{d.paidAt ? new Date(d.paidAt).toLocaleDateString('id-ID') : '-'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>Belum ada data penyaluran</td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4} className="text-right font-semibold">Total:</td>
                <td className="mono font-semibold">Rp {formatRupiah(totalDisbursed)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="table-mobile-cards">
        {paginatedRows.map((d, i) => (
          <div key={d.id} className="table-card">
            <div className="table-card-header">
              <div className="table-card-header-left">
                <div className="table-card-header-title">{d.recipientName}</div>
                <div className="table-card-header-subtitle">{d.disbursementNumber}</div>
              </div>
              <span className="table-card-header-badge bg-primary-50 text-primary-700">
                #{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}
              </span>
            </div>
            <div className="table-card-row">
              <span className="table-card-row-label">Kategori</span>
              <span className="table-card-row-value">{d.category || '-'}</span>
            </div>
            <div className="table-card-row">
              <span className="table-card-row-label">Nominal</span>
              <span className="table-card-row-value mono">Rp {formatRupiah(d.amount)}</span>
            </div>
            <div className="table-card-row">
              <span className="table-card-row-label">Tanggal</span>
              <span className="table-card-row-value">
                {d.paidAt ? new Date(d.paidAt).toLocaleDateString('id-ID') : '-'}
              </span>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="text-center py-8 text-gray-500">Belum ada data penyaluran</div>
        )}
        {rows.length > 0 && (
          <div className="table-card" style={{ background: '#f9fafb' }}>
            <div className="table-card-row">
              <span className="table-card-row-label font-semibold">Total Penyaluran</span>
              <span className="table-card-row-value mono font-semibold">Rp {formatRupiah(totalDisbursed)}</span>
            </div>
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
                <span key={index} className="pagination__ellipsis">{page}</span>
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
