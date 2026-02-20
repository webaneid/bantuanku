'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n/provider';

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
  const { t } = useI18n();
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
            {t('qurbanDetail.tabs.description')}
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
            {t('qurbanDetail.tabs.packageInfo')}
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
              <p className="text-gray-500">{t('qurbanDetail.tabs.noDescription')}</p>
            )}
          </div>
        )}

        {activeTab === 'info' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">{t('qurbanDetail.tabs.labels.period')}</h3>
              <p className="text-base text-gray-900">{periodName}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">{t('qurbanDetail.tabs.labels.animalType')}</h3>
              <p className="text-base text-gray-900">{animalType}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">{t('qurbanDetail.tabs.labels.packageType')}</h3>
              <p className="text-base text-gray-900">
                {packageType === 'individual'
                  ? t('qurbanDetail.tabs.values.packageIndividual')
                  : t('qurbanDetail.tabs.values.packageShared')}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('qurbanDetail.tabs.terms.title')}</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('qurbanDetail.tabs.terms.items.quality')}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('qurbanDetail.tabs.terms.items.sharia')}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('qurbanDetail.tabs.terms.items.distribution')}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('qurbanDetail.tabs.terms.items.documentation')}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('qurbanDetail.tabs.terms.items.certificate')}</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
