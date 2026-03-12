import { Hono } from "hono";
import { eq, or } from "drizzle-orm";
import { settings } from "@bantuanku/db";
import { decrypt } from "../lib/encryption";
import { success, error } from "../lib/response";
import type { Env, Variables } from "../types";

// In-memory cache for Google Reviews
// Caching helps avoid hitting rate limits and ensures the API response is fast.
interface CacheEntry {
    reviews: any;
    lastFetchTime: number;
}
const reviewsCache: Record<string, CacheEntry> = {};
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function clearTestimonialsCache() {
    for (const key of Object.keys(reviewsCache)) {
        delete reviewsCache[key];
    }
}

const testimonialsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

testimonialsRoutes.get("/", async (c) => {
    const db = c.get("db");

    // Fetch Google Maps settings from DB
    const gmSettings = await db.query.settings.findMany({
        where: or(
            eq(settings.key, "google_maps_enabled"),
            eq(settings.key, "google_maps_api_key"),
            eq(settings.key, "google_maps_place_id"),
            eq(settings.key, "google_maps_min_rating"),
            eq(settings.key, "google_maps_max_reviews")
        ),
    });

    const config: Record<string, any> = {
        enabled: false,
        apiKey: "",
        placeId: "",
        minRating: 4,
        maxReviews: 5,
    };

    for (const s of gmSettings) {
        if (s.key === "google_maps_enabled") config.enabled = s.value === "true";
        if (s.key === "google_maps_api_key") config.apiKey = s.value;
        if (s.key === "google_maps_place_id") config.placeId = s.value;
        if (s.key === "google_maps_min_rating") config.minRating = parseInt(s.value) || 4;
        if (s.key === "google_maps_max_reviews") config.maxReviews = parseInt(s.value) || 5;
    }

    if (!config.enabled || !config.apiKey || !config.placeId) {
        return success(c, {
            enabled: false,
            reviews: [],
        });
    }

    const lang = c.req.query("lang") || "id";

    // Decrypt API key before using it
    config.apiKey = decrypt(config.apiKey);

    // Check Cache
    const now = Date.now();
    const cacheEntry = reviewsCache[lang];
    if (cacheEntry && now - cacheEntry.lastFetchTime < CACHE_DURATION_MS) {
        // Process cache to apply current settings (minRating, maxReviews) incase they changed
        const filteredReviews = cacheEntry.reviews
            .filter((r: any) => r.rating >= config.minRating)
            .slice(0, config.maxReviews);

        return success(c, {
            enabled: true,
            reviews: filteredReviews,
        });
    }

    // Fetch fresh data from Google
    try {
        const googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${config.placeId}&fields=name,rating,reviews&language=${lang}&key=${config.apiKey}`;
        const response = await fetch(googleUrl);

        if (!response.ok) {
            throw new Error(`Google API error: ${response.status}`);
        }

        const data: any = await response.json();

        if (data.status !== "OK") {
            throw new Error(`Google API return status: ${data.status}`);
        }

        // Clean up author avatar urls (sometimes Google returns broken ones like those ending in /photo.jpg)
        let reviews = data.result?.reviews || [];
        reviews = reviews.map((r: any) => {
            // We strip profile_photo_url completely or use a fallback mechanism
            // For privacy and stability reasons we rely on names
            const cleanRef = { ...r };
            delete cleanRef.profile_photo_url;
            return cleanRef;
        });

        // Update Cache
        reviewsCache[lang] = {
            reviews,
            lastFetchTime: now
        };

        // Filter and Slice for response
        const filteredReviews = reviews
            .filter((r: any) => r.rating >= config.minRating)
            .slice(0, config.maxReviews);

        return success(c, {
            enabled: true,
            reviews: filteredReviews,
        });
    } catch (err: any) {
        console.error("Failed to fetch Google reviews:", err);

        // Fallback to cache if available, even if expired
        if (cacheEntry) {
            const filteredReviews = cacheEntry.reviews
                .filter((r: any) => r.rating >= config.minRating)
                .slice(0, config.maxReviews);

            return success(c, {
                enabled: true,
                reviews: filteredReviews,
                cached: true,
            });
        }

        return error(c, "Gagal mengambil testimoni dari Google Maps", 500);
    }
});

export default testimonialsRoutes;
