import { ProductWishlistButton } from "@/components/products/ProductWishlistButton";

interface BusinessOwnerWishlistButtonProps {
  productId?: string;
  businessName: string;
}

/**
 * 사업장 카드의 대표 상품을 찜하는 버튼입니다.
 * 사업장 카드는 여러 상품을 묶어 보여주므로, 찜 데이터는 대표 상품 id로
 * 기존 wishlists 테이블과 동일하게 저장합니다.
 */
export function BusinessOwnerWishlistButton({
  productId,
  businessName,
}: BusinessOwnerWishlistButtonProps) {
  return (
    <ProductWishlistButton
      productId={productId}
      label={`${businessName} 대표 상품`}
    />
  );
}
