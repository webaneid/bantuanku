import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { formatRupiah } from '@/lib/format';
import { ProgressBar } from '@/components/molecules';
import { Badge, ProgramBadge } from '@/components/atoms';

export interface ProgramCardProps extends React.HTMLAttributes<HTMLDivElement> {
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
  variant?: 'default' | 'compact' | 'featured';
}

export const ProgramCard = React.forwardRef<HTMLDivElement, ProgramCardProps>(
  (
    {
      id,
      slug,
      title,
      description,
      image,
      categoryName,
      currentAmount,
      targetAmount,
      donorCount,
      daysLeft,
      isUrgent = false,
      variant = 'default',
      className,
      ...props
    },
    ref
  ) => {
    const percentage = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;
    const isCompleted = percentage >= 100;

    return (
      <div
        ref={ref}
        className={cn(
          'program-card',
          `program-card--${variant}`,
          isUrgent && 'program-card--urgent',
          isCompleted && 'program-card--completed',
          className
        )}
        {...props}
      >
        <Link href={`/program/${slug}`} className="program-card__link">
          {/* Image */}
          <div className="program-card__image-wrapper">
            {image ? (
              <Image
                src={image}
                alt={title}
                fill
                className="program-card__image"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="program-card__image-placeholder">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            )}

            {/* Badges */}
            <div className="program-card__badges">
              <ProgramBadge label={categoryName} variant="primary" />
              {isUrgent && <Badge variant="danger" dot>Mendesak</Badge>}
              {isCompleted && <Badge variant="success">Target Tercapai</Badge>}
            </div>

            {daysLeft !== undefined && daysLeft > 0 && (
              <div className="program-card__days-left">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 4v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>{daysLeft} hari lagi</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="program-card__content">
            <h3 className="program-card__title">{title}</h3>

            {variant !== 'compact' && (
              <p className="program-card__description">{description}</p>
            )}

            {/* Progress */}
            <div className="program-card__progress">
              <ProgressBar
                current={currentAmount}
                target={targetAmount}
                size={variant === 'compact' ? 'sm' : 'md'}
                showLabel={false}
                variant={isCompleted ? 'success' : 'default'}
              />

              <div className="program-card__stats">
                <div className="program-card__stat">
                  <span className="program-card__stat-label">Terkumpul</span>
                  <span className="program-card__stat-value mono">
                    Rp {formatRupiah(currentAmount)}
                  </span>
                </div>
                <div className="program-card__stat program-card__stat--right">
                  <span className="program-card__stat-label">Donatur</span>
                  <span className="program-card__stat-value">{donorCount}</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            {variant === 'featured' && (
              <button className="program-card__cta">
                Donasi Sekarang
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </Link>
      </div>
    );
  }
);

ProgramCard.displayName = 'ProgramCard';
