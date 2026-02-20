'use client';

import { useMemo, useState } from 'react';
import { getImageUrlByVariant } from '@/lib/image';

interface CampaignGalleryProps {
  featuredImage: string;
  galleryImages?: string[] | null;
  altText: string;
}

export default function CampaignGallery({
  featuredImage,
  galleryImages,
  altText,
}: CampaignGalleryProps) {
  const images = useMemo(() => {
    const list = [featuredImage, ...(galleryImages || [])]
      .filter((img): img is string => typeof img === 'string' && img.trim().length > 0);
    return Array.from(new Set(list));
  }, [featuredImage, galleryImages]);

  const [selectedImage, setSelectedImage] = useState<string>(images[0] || featuredImage);

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm">
      <img
        src={getImageUrlByVariant(selectedImage, ['large', 'medium'])}
        alt={altText}
        className="w-full aspect-video object-contain bg-gray-100"
      />

      {images.length > 1 && (
        <div className="p-3 border-t border-gray-100">
          <div className="flex gap-2 overflow-x-auto">
            {images.map((image, index) => {
              const isActive = image === selectedImage;
              return (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    isActive ? 'border-primary-500' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img
                    src={getImageUrlByVariant(image, ['thumbnail', 'medium'])}
                    alt={`${altText} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
