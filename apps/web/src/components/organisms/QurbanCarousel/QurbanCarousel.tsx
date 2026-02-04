'use client';

import React, { useState, useRef } from 'react';
import { QurbanCard, QurbanCardProps } from '../QurbanCard';
import { cn } from '@/lib/cn';
import './QurbanCarousel.css';

export interface QurbanCarouselProps {
  items: QurbanCardProps[];
}

export const QurbanCarousel: React.FC<QurbanCarouselProps> = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;

    // Get container width
    const containerWidth = scrollRef.current.clientWidth;

    // Calculate how many cards are visible at once
    const cardWidth = 320; // Approximate card width
    const gap = 24; // Gap between cards
    const cardsPerView = Math.floor(containerWidth / (cardWidth + gap));

    const newIndex = direction === 'left'
      ? Math.max(0, currentIndex - cardsPerView)
      : Math.min(items.length - cardsPerView, currentIndex + cardsPerView);

    setCurrentIndex(newIndex);
    scrollRef.current.scrollTo({
      left: newIndex * (cardWidth + gap),
      behavior: 'smooth'
    });
  };

  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex < items.length - 1;

  return (
    <div className="qurban-carousel">
      <div className="qurban-carousel__container">
        {/* Navigation Button - Left */}
        {canScrollLeft && (
          <button
            className="qurban-carousel__nav qurban-carousel__nav--prev"
            onClick={() => scroll('left')}
            aria-label="Previous"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Carousel Track */}
        <div className="qurban-carousel__track" ref={scrollRef}>
          {items.map((item) => (
            <div key={item.id} className="qurban-carousel__item">
              <QurbanCard {...item} />
            </div>
          ))}
        </div>

        {/* Navigation Button - Right */}
        {canScrollRight && (
          <button
            className="qurban-carousel__nav qurban-carousel__nav--next"
            onClick={() => scroll('right')}
            aria-label="Next"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
