"use client";

import { ProductCard } from "./ProductCard";
import type { Product } from "@/services/productService";

interface ProductGridProps {
  products: Product[];
  onWishlistToggle?: (productId: string) => void;
  wishlistedIds?: Set<string>;
}

export function ProductGrid({
  products,
  onWishlistToggle,
  wishlistedIds = new Set(),
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-gray-400 mb-4">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          검색 결과가 없습니다
        </h3>
        <p className="text-gray-500">
          다른 검색어나 필터를 사용해보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onWishlistToggle={onWishlistToggle}
          isWishlisted={wishlistedIds.has(product.id)}
        />
      ))}
    </div>
  );
}
