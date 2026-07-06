'use client';

import React from 'react';
import Link from 'next/link';
import { QurbanCarousel } from '../QurbanCarousel';
import { QurbanCardProps } from '../QurbanCard';
import { Button } from '@/components/atoms';
import feedbackToast from '@/lib/feedback-toast';

export interface QurbanSectionProps {
  items: QurbanCardProps[];
  title?: string;
  description?: string;
}

export const QurbanSection: React.FC<QurbanSectionProps> = ({
  items,
  title = 'Paket Qurban 1446 H',
  description = 'Pilih hewan qurban berkualitas terbaik untuk ibadah Anda',
}) => {
  const handleAddToCart = (item: QurbanCardProps) => {
    // TODO: Implement add to cart logic
    feedbackToast.success(`${item.name} ditambahkan ke keranjang!`);
  };

  // Add onAddToCart handler to each item
  const itemsWithHandler = items.map(item => ({
    ...item,
    onAddToCart: () => handleAddToCart(item),
  }));

  if (itemsWithHandler.length === 0) return null;

  return (
    <section id="section-qurban" className="section-qurban py-16 bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container">
        <div className="text-center mb-4">
          <h2 className="section-title text-gray-900">
            {title}
          </h2>
          <p className="section-description text-gray-600">
            {description}
          </p>
        </div>

        <QurbanCarousel items={itemsWithHandler} />

        <div className="text-center mt-4">
          <Link href="/qurban">
            <Button size="lg" className="bg-amber-600 hover:bg-amber-700">
              Lihat Semua Paket Qurban
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M7 4l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
