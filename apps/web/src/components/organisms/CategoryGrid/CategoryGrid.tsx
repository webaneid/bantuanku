'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

interface CategoryItem {
  name: string;
  slug: string;
  description: string;
  iconSvg?: string; // Full SVG code
  gradient?: string;
}

interface CategoryGridProps {
  categories: CategoryItem[];
}

// Default fallback SVG icon
const DEFAULT_ICON_SVG = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>';

export const CategoryGrid: React.FC<CategoryGridProps> = ({ categories }) => {
  return (
    <div className="category-grid">
      {categories.map((category) => {
        // Handle both full paths and simple slugs
        const href = category.slug.startsWith('/') ? category.slug : `/${category.slug}`;
        return (
          <Link
            key={category.slug}
            href={href}
            className="category-card"
          >
          <div className={cn('category-card__inner', category.gradient || 'gradient-primary')}>
            <div
              className="category-card__icon"
              dangerouslySetInnerHTML={{ __html: category.iconSvg || DEFAULT_ICON_SVG }}
            />
            <div className="category-card__content">
              <h3 className="category-card__title">{category.name}</h3>
              <p className="category-card__description">{category.description || ''}</p>
            </div>
            <div className="category-card__arrow">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </Link>
        );
      })}
    </div>
  );
};
