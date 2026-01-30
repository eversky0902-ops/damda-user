"use client";

import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselDots,
} from "@/components/ui/carousel";
import type { Banner } from "@/services/bannerService";

interface HeroBannerCarouselProps {
  banners: Banner[];
}

export function HeroBannerCarousel({ banners }: HeroBannerCarouselProps) {
  const defaultImage = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80";

  if (banners.length === 0) {
    return (
      <div className="relative h-[400px]">
        <Image
          src={defaultImage}
          alt="어린이 체험학습"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/30" />
      </div>
    );
  }

  return (
    <Carousel
      opts={{
        loop: true,
        align: "start",
      }}
      plugins={[
        Autoplay({
          delay: 5000,
          stopOnInteraction: false,
        }),
      ]}
      className="w-full"
    >
      <CarouselContent className="ml-0">
        {banners.map((banner) => (
          <CarouselItem key={banner.id} className="pl-0">
            <div className="relative h-[400px]">
              <Image
                src={banner.image_url || defaultImage}
                alt={banner.title || "메인 배너"}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/30" />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <CarouselDots />
        </div>
      )}
    </Carousel>
  );
}
