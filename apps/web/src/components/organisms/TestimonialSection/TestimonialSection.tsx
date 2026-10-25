import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { id, enUS } from 'date-fns/locale';

import { fetchTestimonials } from '@/services/testimonials';
import { translate } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';

export interface TestimonialSectionProps {
  locale: Locale;
}

const STAR_PATH =
  'M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z';

/**
 * Server component: ulasan diambil dan dirender di server, sehingga tidak ada JS/request tambahan di browser.
 * Geser memakai scroll-snap CSS (tanpa Swiper).
 */
export const TestimonialSection = async ({ locale }: TestimonialSectionProps) => {
  const reviews = await fetchTestimonials(locale);
  if (reviews.length === 0) return null;

  const t = (key: string, params?: Record<string, string | number>) => translate(locale, key, params);
  const dateLocale = locale === 'en' ? enUS : id;

  return (
    <section className="testimonial-section">
      <div className="testimonial-section__decor" />

      <div className="container">
        <div className="testimonial-section__header">
          <h2 className="section-title text-dark">{t('testimonial.title')}</h2>
          <p className="section-description text-gray-600">{t('testimonial.description')}</p>
        </div>

        <div className="testimonial-section__slider">
          <div className="testimonial-section__track">
            {reviews.map((review, index) => (
              <div key={index} className="testimonial-section__slide">
                <div className="testimonial-card">
                  <div className="testimonial-card__quote-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                  </div>

                  <div className="testimonial-card__stars" role="img" aria-label={`${review.rating}/5`}>
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className={i < review.rating ? 'text-warning-400' : 'text-gray-200'}
                        aria-hidden="true"
                      >
                        <path fillRule="evenodd" clipRule="evenodd" d={STAR_PATH} />
                      </svg>
                    ))}
                  </div>

                  <p className="testimonial-card__text">
                    &ldquo;{review.text || t('testimonial.defaultReview', { rating: review.rating })}&rdquo;
                  </p>

                  <div className="testimonial-card__author">
                    <div className="testimonial-card__avatar">{review.author_name.charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="testimonial-card__name">{review.author_name}</div>
                      <div className="testimonial-card__time">
                        {t('testimonial.reviewedPrefix')}
                        {formatDistanceToNow(new Date(review.time * 1000), { addSuffix: true, locale: dateLocale })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
