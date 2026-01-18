"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageGalleryProps {
  images: { id: string; image_url: string }[];
  thumbnail: string;
  productName: string;
}

function NoImagePlaceholder() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
      <Image
        src="/logo.svg"
        alt="담다"
        width={120}
        height={60}
        className="opacity-30"
      />
      <span className="text-sm text-gray-400 mt-3">No Image</span>
    </div>
  );
}

export function ImageGallery({ images, thumbnail, productName }: ImageGalleryProps) {
  // 썸네일을 포함한 전체 이미지 배열
  const allImages = thumbnail
    ? [
        { id: "thumbnail", image_url: thumbnail },
        ...images.filter((img) => img.image_url !== thumbnail),
      ]
    : images.length > 0
    ? images
    : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const handleImageError = (index: number) => {
    setImageErrors((prev) => new Set(prev).add(index));
  };

  const hasNoImages = allImages.length === 0;
  const currentImageHasError = imageErrors.has(currentIndex);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="space-y-4">
      {/* 메인 이미지 */}
      <div className="relative aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden">
        {hasNoImages || currentImageHasError ? (
          <NoImagePlaceholder />
        ) : (
          <Image
            src={allImages[currentIndex]?.image_url}
            alt={`${productName} - 이미지 ${currentIndex + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            onError={() => handleImageError(currentIndex)}
          />
        )}

        {/* 네비게이션 버튼 */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors"
              aria-label="이전 이미지"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors"
              aria-label="다음 이미지"
            >
              <ChevronRight className="w-6 h-6 text-gray-700" />
            </button>
          </>
        )}

        {/* 인디케이터 */}
        {allImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {allImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === currentIndex ? "bg-white" : "bg-white/50"
                )}
                aria-label={`이미지 ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 썸네일 목록 */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {allImages.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors bg-gray-50",
                index === currentIndex
                  ? "border-damda-yellow"
                  : "border-transparent hover:border-gray-300"
              )}
            >
              {imageErrors.has(index) ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image
                    src="/logo.svg"
                    alt="담다"
                    width={40}
                    height={20}
                    className="opacity-30"
                  />
                </div>
              ) : (
                <Image
                  src={image.image_url}
                  alt={`${productName} - 썸네일 ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                  onError={() => handleImageError(index)}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
