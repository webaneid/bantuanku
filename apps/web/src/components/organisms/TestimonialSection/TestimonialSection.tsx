"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { StarIcon } from "@heroicons/react/24/solid";
import { formatDistanceToNow } from "date-fns";
import { id, enUS } from "date-fns/locale";

import api from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

interface Review {
    author_name: string;
    rating: number;
    relative_time_description: string;
    text: string;
    time: number;
}

interface TestimonialData {
    enabled: boolean;
    reviews: Review[];
    cached?: boolean;
}

export const TestimonialSection = () => {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const { locale } = useI18n();
    const dateLocale = locale === "en" ? enUS : id;

    const { data, isLoading, error } = useQuery<TestimonialData>({
        queryKey: ["google-testimonials", locale],
        queryFn: async () => {
            const response = await api.get("/testimonials", { params: { lang: locale } });
            return response.data.data;
        },
        staleTime: 1000 * 60 * 60,
    });

    if (isLoading) {
        return (
            <section className="testimonial-section">
                <div className="container">
                    <div className="testimonial-section__header">
                        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mx-auto mb-4" />
                        <div className="h-4 w-64 bg-gray-200 rounded-lg animate-pulse mx-auto" />
                    </div>
                    <div className="flex gap-4 overflow-hidden">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="min-w-[260px] h-56 bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse" />
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (error || !data || !data.enabled || !data.reviews || data.reviews.length === 0) {
        return null;
    }

    return (
        <section className="testimonial-section">
            <div className="testimonial-section__decor" />

            <div className="container">
                <div className="testimonial-section__header">
                    <h2 className="section-title text-gray-900">
                        {locale === 'en' ? 'What People Say About Us' : 'Kata Orang Tentang Kami'}
                    </h2>
                    <p className="section-description text-gray-600">
                        {locale === 'en' ? 'Your trust is our priority. See the experiences of donors and beneficiaries.' : 'Kepercayaan Anda adalah prioritas kami. Simak pengalaman para donatur dan penerima manfaat.'}
                    </p>
                </div>

                <div className="testimonial-section__slider">
                    {mounted && (
                        React.createElement((Swiper as any), {
                            modules: [Autoplay, Pagination],
                            spaceBetween: 16,
                            slidesPerView: 1,
                            breakpoints: {
                                640: { slidesPerView: 2, spaceBetween: 16 },
                                768: { slidesPerView: 3, spaceBetween: 20 },
                                1024: { slidesPerView: 4, spaceBetween: 24 },
                            },
                            autoplay: {
                                delay: 5000,
                                disableOnInteraction: false,
                                pauseOnMouseEnter: true,
                            },
                            pagination: {
                                clickable: true,
                                dynamicBullets: true,
                            },
                        },
                            data.reviews.map((review, index) => (
                                React.createElement((SwiperSlide as any), { key: index, className: "h-auto" },
                                    <div className="testimonial-card">
                                        <div className="testimonial-card__quote-icon">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                                            </svg>
                                        </div>

                                        <div className="testimonial-card__stars">
                                            {[...Array(5)].map((_, i) => (
                                                <React.Fragment key={i}>
                                                    {/* @ts-expect-error - Heroicons typings mismatch */}
                                                    <StarIcon
                                                        className={i < review.rating ? "text-yellow-400" : "text-gray-200"}
                                                    />
                                                </React.Fragment>
                                            ))}
                                        </div>

                                        <p className="testimonial-card__text">
                                            &ldquo;{review.text || (locale === 'en' ? "Rated " + review.rating + " stars." : "Memberikan rating " + review.rating + " bintang.")}&rdquo;
                                        </p>

                                        <div className="testimonial-card__author">
                                            <div className="testimonial-card__avatar">
                                                {review.author_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="testimonial-card__name">{review.author_name}</div>
                                                <div className="testimonial-card__time">
                                                    {locale === 'en' ? 'Reviewed ' : 'Diulas '} {formatDistanceToNow(new Date(review.time * 1000), {
                                                        addSuffix: true,
                                                        locale: dateLocale,
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            )))
                    )}
                </div>
            </div>
        </section>
    );
};
