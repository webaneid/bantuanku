'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/cn';

interface QurbanTabsProps {
  packageId: string;
  packageDescription: string;
  animalType: string;
  packageType: string;
  periodName: string;
}

export default function QurbanTabs({
  packageDescription,
  animalType,
  packageType,
  periodName,
}: QurbanTabsProps) {
  const [activeTab, setActiveTab] = useState<'description' | 'info'>('description');

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Tab Headers */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('description')}
            className={cn(
              'px-6 py-4 font-medium text-sm transition-colors relative',
              activeTab === 'description'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Deskripsi
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={cn(
              'px-6 py-4 font-medium text-sm transition-colors relative',
              activeTab === 'info'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Informasi Paket
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'description' && (
          <div className="prose prose-sm max-w-none">
            {packageDescription ? (
              <div dangerouslySetInnerHTML={{ __html: packageDescription }} />
            ) : (
              <p className="text-gray-500">Belum ada deskripsi untuk paket qurban ini.</p>
            )}
          </div>
        )}

        {activeTab === 'info' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Periode</h3>
              <p className="text-base text-gray-900">{periodName}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Jenis Hewan</h3>
              <p className="text-base text-gray-900">{animalType}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Tipe Paket</h3>
              <p className="text-base text-gray-900">
                {packageType === 'individual' ? 'Individu' : 'Patungan (Shared)'}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Ketentuan</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Hewan qurban berkualitas dan sehat</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Disembelih sesuai syariat Islam</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Daging disalurkan kepada yang berhak</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Dokumentasi lengkap penyembelihan</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Sertifikat digital untuk peserta qurban</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
