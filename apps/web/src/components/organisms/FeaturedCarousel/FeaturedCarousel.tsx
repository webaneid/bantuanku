'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatRupiah } from '@/lib/format';
import { ProgressBar } from '@/components/molecules';
import { Badge, ProgramBadge } from '@/components/atoms';

export interface FeaturedCarouselProps {
  campaigns: Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    image: string;
    categoryName: string;
    currentAmount: number;
    targetAmount: number;
    donorCount: number;
    daysLeft?: number;
    isUrgent?: boolean;
  }>;
}

export const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({ campaigns }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;

    const scrollAmount = scrollRef.current.clientWidth;
    const newIndex = direction === 'left'
      ? Math.max(0, currentIndex - 1)
      : Math.min(campaigns.length - 1, currentIndex + 1);

    setCurrentIndex(newIndex);
    scrollRef.current.scrollTo({
      left: newIndex * scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className="featured-carousel">
      <div className="featured-carousel__container">
        <button
          className="featured-carousel__nav featured-carousel__nav--prev"
          onClick={() => scroll('left')}
          disabled={currentIndex === 0}
          aria-label="Previous"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="featured-carousel__track" ref={scrollRef}>
          {campaigns.map((campaign) => {
            const percentage = campaign.targetAmount > 0
              ? Math.min((campaign.currentAmount / campaign.targetAmount) * 100, 100)
              : 0;
            const isCompleted = percentage >= 100;

            return (
              <div key={campaign.id} className="featured-carousel__slide">
                <div className={cn(
                  'featured-card',
                  campaign.isUrgent && 'featured-card--urgent',
                  isCompleted && 'featured-card--completed'
                )}>
                  <Link href={`/program/${campaign.slug}`} className="featured-card__link">
                    {/* Image */}
                    <div className="featured-card__image-wrapper">
                      {campaign.image ? (
                        <Image
                          src={campaign.image}
                          alt={campaign.title}
                          fill
                          className="featured-card__image"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="featured-card__image-placeholder">
                          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                        </div>
                      )}

                      {/* Badges */}
                      <div className="featured-card__badges">
                        <ProgramBadge label={campaign.categoryName} variant="primary" />
                        {campaign.isUrgent && <Badge variant="danger" dot>Mendesak</Badge>}
                        {isCompleted && <Badge variant="success">Target Tercapai</Badge>}
                      </div>

                      {campaign.daysLeft !== undefined && campaign.daysLeft > 0 && (
                        <div className="featured-card__days-left">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2"/>
                            <path d="M8 4v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          <span>{campaign.daysLeft} hari lagi</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="featured-card__content">
                      <h3 className="featured-card__title">{campaign.title}</h3>
                      <p className="featured-card__description">{campaign.description}</p>

                      {/* Progress */}
                      <div className="featured-card__progress">
                        <ProgressBar
                          current={campaign.currentAmount}
                          target={campaign.targetAmount}
                          size="md"
                          showLabel={false}
                          variant={isCompleted ? 'success' : 'default'}
                        />

                        <div className="featured-card__stats">
                          <div className="featured-card__stat">
                            <span className="featured-card__stat-label">Terkumpul</span>
                            <span className="featured-card__stat-value mono">
                              Rp {formatRupiah(campaign.currentAmount)}
                            </span>
                          </div>
                          <div className="featured-card__stat featured-card__stat--right">
                            <span className="featured-card__stat-label">Donatur</span>
                            <span className="featured-card__stat-value">{campaign.donorCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <button
          className="featured-carousel__nav featured-carousel__nav--next"
          onClick={() => scroll('right')}
          disabled={currentIndex === campaigns.length - 1}
          aria-label="Next"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Dots indicator */}
      <div className="featured-carousel__dots">
        {campaigns.map((_, index) => (
          <button
            key={index}
            className={cn(
              'featured-carousel__dot',
              index === currentIndex && 'featured-carousel__dot--active'
            )}
            onClick={() => {
              setCurrentIndex(index);
              if (scrollRef.current) {
                scrollRef.current.scrollTo({
                  left: index * scrollRef.current.clientWidth,
                  behavior: 'smooth'
                });
              }
            }}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
