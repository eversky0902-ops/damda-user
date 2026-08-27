"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { ImageIcon, Images } from "lucide-react";
import { ImageGallery } from "@/components/products/ImageGallery";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface GalleryImage {
  id: string;
  image_url: string;
}

interface BusinessImageGalleryProps {
  images: GalleryImage[];
  businessName: string;
  fallbackImage?: string | null;
}

export function BusinessImageGallery({
  images,
  businessName,
  fallbackImage,
}: BusinessImageGalleryProps) {
  const allImages = images.length
    ? images
    : fallbackImage
      ? [{ id: "fallback", image_url: fallbackImage }]
      : [];
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const desktopImages = allImages.slice(0, 5);

  const handleError = (id: string) => {
    setFailedImages((current) => new Set(current).add(id));
  };

  return (
    <>
      <div className="md:hidden">
        <ImageGallery
          images={allImages}
          thumbnail={allImages[0]?.image_url || ""}
          productName={businessName}
          aspectClassName="aspect-[4/3]"
        />
      </div>

      <div className="hidden aspect-[16/7] grid-cols-[minmax(0,3fr)_minmax(320px,2fr)] gap-2 overflow-hidden rounded-3xl bg-gray-100 md:grid">
        <GalleryTile
          image={desktopImages[0]}
          businessName={businessName}
          failed={desktopImages[0] ? failedImages.has(desktopImages[0].id) : false}
          onError={handleError}
          onClick={() => desktopImages[0] && setSelectedIndex(0)}
          priority
          className="h-full"
          sizes="60vw"
        />

        <div className="grid min-w-0 grid-cols-2 grid-rows-2 gap-2">
          {Array.from({ length: 4 }).map((_, index) => {
            const image = desktopImages[index + 1];
            return (
              <GalleryTile
                key={image?.id || `empty-${index}`}
                image={image}
                businessName={businessName}
                failed={image ? failedImages.has(image.id) : false}
                onError={handleError}
                onClick={() => image && setSelectedIndex(index + 1)}
                sizes="20vw"
                className="h-full"
              >
                {index === 3 && allImages.length > 0 && (
                  <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/70 px-3 py-2 text-xs font-semibold text-white">
                    <Images className="h-4 w-4" />
                    전체 사진 {allImages.length}장
                  </span>
                )}
              </GalleryTile>
            );
          })}
        </div>
      </div>

      <Dialog open={selectedIndex !== null} onOpenChange={(open) => !open && setSelectedIndex(null)}>
        <DialogContent className="max-h-[92vh] max-w-[calc(100%-2rem)] overflow-y-auto bg-black p-3 sm:max-w-5xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{businessName} 사진</DialogTitle>
            <DialogDescription>선택한 사업장 사진을 크게 봅니다.</DialogDescription>
          </DialogHeader>
          {selectedIndex !== null && allImages[selectedIndex] && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-950 sm:aspect-[16/10]">
              <Image
                src={allImages[selectedIndex].image_url}
                alt={`${businessName} 사진 ${selectedIndex + 1}`}
                fill
                className="object-contain"
                sizes="90vw"
                unoptimized={allImages[selectedIndex].image_url.startsWith("http")}
              />
            </div>
          )}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {allImages.map((image, index) => (
              <button
                type="button"
                key={image.id}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-gray-900",
                  selectedIndex === index ? "border-damda-yellow" : "border-transparent"
                )}
              >
                <Image
                  src={image.image_url}
                  alt={`${businessName} 썸네일 ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                  unoptimized={image.image_url.startsWith("http")}
                />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function GalleryTile({
  image,
  businessName,
  failed,
  onError,
  onClick,
  priority = false,
  sizes,
  className,
  children,
}: {
  image?: GalleryImage;
  businessName: string;
  failed: boolean;
  onError: (id: string) => void;
  onClick: () => void;
  priority?: boolean;
  sizes: string;
  className?: string;
  children?: ReactNode;
}) {
  if (!image || failed) {
    return (
      <div className={cn("relative flex min-h-0 items-center justify-center bg-gray-100 text-gray-300", className)}>
        <ImageIcon className="h-8 w-8" />
        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("group relative min-h-0 overflow-hidden bg-gray-100", className)}
      aria-label={`${businessName} 사진 크게 보기`}
    >
      <Image
        src={image.image_url}
        alt={businessName}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        sizes={sizes}
        priority={priority}
        unoptimized={image.image_url.startsWith("http")}
        onError={() => onError(image.id)}
      />
      {children}
    </button>
  );
}
