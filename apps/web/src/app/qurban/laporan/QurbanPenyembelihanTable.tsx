'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/format';

interface ExecutionRow {
  id: string;
  executionNumber: string;
  executionDate: string;
  location: string;
  animalType: string;
  animalWeight: number | null;
  animalCondition: string | null;
  distributionMethod: string | null;
  recipientCount: number | null;
}

function animalLabel(value: string) {
  const key = (value || '').toLowerCase();
  if (key === 'cow' || key === 'sapi') return 'Sapi';
  if (key === 'goat' || key === 'kambing') return 'Kambing';
  if (key === 'sheep' || key === 'domba') return 'Domba';
  return value || '-';
}

function distributionLabel(value: string | null) {
  if (!value) return '-';
  if (value === 'direct_pickup') return 'Ambil Langsung';
  if (value === 'distribution') return 'Distribusi';
  if (value === 'donation') return 'Donasi';
  return value;
}

const ITEMS_PER_PAGE = 10;

export default function QurbanPenyembelihanTable({ rows }: { rows: ExecutionRow[] }) {
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
              <th>No. Eksekusi</th>
              <th>Tanggal</th>
              <th>Lokasi</th>
              <th>Hewan</th>
              <th>Berat (kg)</th>
              <th>Kondisi</th>
              <th>Distribusi</th>
              <th>Penerima</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((e, i) => (
              <tr key={e.id}>
                <td>{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                <td>{e.executionNumber}</td>
                <td>{formatDate(e.executionDate)}</td>
                <td>{e.location}</td>
                <td>{animalLabel(e.animalType)}</td>
                <td>{e.animalWeight ?? '-'}</td>
                <td>{e.animalCondition || '-'}</td>
                <td>{distributionLabel(e.distributionMethod)}</td>
                <td>{e.recipientCount ?? '-'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={9}>Belum ada data penyembelihan</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="table-mobile-cards">
        {paginatedRows.map((e, i) => (
          <div key={e.id} className="table-card">
            <div className="table-card-header">
              <div className="table-card-header-left">
                <div className="table-card-header-title">{e.executionNumber}</div>
                <div className="table-card-header-subtitle">{formatDate(e.executionDate)}</div>
              </div>
              <span className="table-card-header-badge bg-warning-50 text-warning-700">
                #{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}
              </span>
            </div>
            <div className="table-card-row">
              <span className="table-card-row-label">Lokasi</span>
              <span className="table-card-row-value">{e.location}</span>
            </div>
            <div className="table-card-row">
              <span className="table-card-row-label">Hewan</span>
              <span className="table-card-row-value">{animalLabel(e.animalType)}</span>
            </div>
            <div className="table-card-row">
              <span className="table-card-row-label">Berat</span>
              <span className="table-card-row-value">{e.animalWeight ? `${e.animalWeight} kg` : '-'}</span>
            </div>
            <div className="table-card-row">
              <span className="table-card-row-label">Kondisi</span>
              <span className="table-card-row-value">{e.animalCondition || '-'}</span>
            </div>
            <div className="table-card-row">
              <span className="table-card-row-label">Distribusi</span>
              <span className="table-card-row-value">{distributionLabel(e.distributionMethod)}</span>
            </div>
            <div className="table-card-row">
              <span className="table-card-row-label">Penerima</span>
              <span className="table-card-row-value">{e.recipientCount ?? '-'}</span>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="text-center py-8 text-gray-500">Belum ada data penyembelihan</div>
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
