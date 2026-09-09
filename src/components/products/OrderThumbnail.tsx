"use client";

import { useState } from "react";
import Image from "next/image";

interface OrderThumbnailProps {
  src?: string | null;
  alt: string;
  sizes: string;
}

export function OrderThumbnail({ src, alt, sizes }: OrderThumbnailProps) {
  const source = src?.trim() || "";
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (!source || source === failedSource) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100" role="img" aria-label={`${alt} 이미지 없음`}>
        <Image src="/logo.svg" alt="" width={48} height={24} className="opacity-40" />
      </div>
    );
  }

  return (
    <Image
      src={source}
      alt={alt}
      fill
      sizes={sizes}
      className="object-cover"
      // Keep order images available when the hosted image optimizer is unavailable.
      unoptimized
      onError={() => setFailedSource(source)}
    />
  );
}
