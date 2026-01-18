"use client";

import { useMemo } from "react";
import { ProductGrid } from "./ProductGrid";
import { useWishlist } from "@/hooks/use-wishlist";
import type { Product } from "@/services/productService";

interface ProductGridWithWishlistProps {
  products: Product[];
}

export function ProductGridWithWishlist({
  products,
}: ProductGridWithWishlistProps) {
  const productIds = useMemo(
    () => products.map((product) => product.id),
    [products]
  );

  const { wishlistedIds, toggleWishlist } = useWishlist(productIds);

  return (
    <ProductGrid
      products={products}
      wishlistedIds={wishlistedIds}
      onWishlistToggle={toggleWishlist}
    />
  );
}
