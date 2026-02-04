'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { Button } from '@/components/atoms';

export interface HeroSlide {
  id: string;
  title: string;
  description: string;
  image: string;
  ctaText?: string;
  ctaLink?: string;
}

export interface HeroSliderProps extends React.HTMLAttributes<HTMLDivElement> {
  slides: HeroSlide[];
  autoplay?: boolean;
  autoplayDelay?: number;
  showIndicators?: boolean;
  showNavigation?: boolean;
}

export const HeroSlider = React.forwardRef<HTMLDivElement, HeroSliderProps>(
  (
    {
      slides,
      autoplay = true,
      autoplayDelay = 5000,
      showIndicators = true,
      showNavigation = false, // Changed default to false
      className,
      ...props
    },
    ref
  ) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const autoplayRef = useRef<NodeJS.Timeout | null>(null);

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50;

    const goToSlide = useCallback(
      (index: number) => {
        if (isAnimating || index === currentSlide) return;
        setIsAnimating(true);
        setCurrentSlide(index);
        setTimeout(() => setIsAnimating(false), 600);
      },
      [currentSlide, isAnimating]
    );

    const nextSlide = useCallback(() => {
      const next = (currentSlide + 1) % slides.length;
      goToSlide(next);
    }, [currentSlide, slides.length, goToSlide]);

    const prevSlide = useCallback(() => {
      const prev = (currentSlide - 1 + slides.length) % slides.length;
      goToSlide(prev);
    }, [currentSlide, slides.length, goToSlide]);

    // Handle touch start
    const onTouchStart = (e: React.TouchEvent) => {
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientX);
      // Pause autoplay on touch
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
    };

    // Handle touch move
    const onTouchMove = (e: React.TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX);
    };

    // Handle touch end
    const onTouchEnd = () => {
      if (!touchStart || !touchEnd) return;

      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe) {
        nextSlide();
      } else if (isRightSwipe) {
        prevSlide();
      }

      // Resume autoplay after touch
      if (autoplay && slides.length > 1) {
        autoplayRef.current = setInterval(nextSlide, autoplayDelay);
      }
    };

    useEffect(() => {
      if (!autoplay || slides.length <= 1) return;

      autoplayRef.current = setInterval(nextSlide, autoplayDelay);
      return () => {
        if (autoplayRef.current) {
          clearInterval(autoplayRef.current);
        }
      };
    }, [autoplay, autoplayDelay, nextSlide, slides.length]);

    if (slides.length === 0) return null;

    return (
      <div ref={ref} className={cn('hero-slider', className)} {...props}>
        <div
          className="hero-slider__slides"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={cn(
                'hero-slider__slide',
                index === currentSlide && 'hero-slider__slide--active',
                index < currentSlide && 'hero-slider__slide--prev',
                index > currentSlide && 'hero-slider__slide--next'
              )}
            >
              {/* Background Image */}
              <div className="hero-slider__image-wrapper">
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  className="hero-slider__image"
                  priority={index === 0}
                  quality={90}
                  sizes="100vw"
                />
                <div className="hero-slider__overlay" />
              </div>

              {/* Content */}
              <div className="hero-slider__content">
                <div className="hero-slider__content-inner">
                  <h1 className="hero-slider__title">{slide.title}</h1>
                  <p className="hero-slider__description">{slide.description}</p>
                  {slide.ctaText && slide.ctaLink && (
                    <Link href={slide.ctaLink}>
                      <Button size="lg" className="hero-slider__cta">
                        {slide.ctaText}
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
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        {showNavigation && slides.length > 1 && (
          <>
            <button
              className="hero-slider__nav hero-slider__nav--prev"
              onClick={prevSlide}
              disabled={isAnimating}
              aria-label="Previous slide"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="hero-slider__nav hero-slider__nav--next"
              onClick={nextSlide}
              disabled={isAnimating}
              aria-label="Next slide"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 18l6-6-6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </>
        )}

        {/* Indicators */}
        {showIndicators && slides.length > 1 && (
          <div className="hero-slider__indicators">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                className={cn(
                  'hero-slider__indicator',
                  index === currentSlide && 'hero-slider__indicator--active'
                )}
                onClick={() => goToSlide(index)}
                disabled={isAnimating}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

HeroSlider.displayName = 'HeroSlider';
