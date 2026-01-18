import { createClient } from "@/lib/supabase/client";

export interface WishlistItem {
  id: string;
  daycare_id: string;
  product_id: string;
  created_at: string;
  product?: {
    id: string;
    name: string;
    thumbnail: string;
    original_price: number;
    sale_price: number;
    region: string | null;
    is_sold_out: boolean;
  };
}

// 찜 목록 조회
export async function getWishlist(): Promise<WishlistItem[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("wishlists")
    .select(
      `
      *,
      product:products (
        id,
        name,
        thumbnail,
        original_price,
        sale_price,
        region,
        is_sold_out
      )
    `
    )
    .eq("daycare_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching wishlist:", error);
    return [];
  }

  return data || [];
}

// 찜 추가
export async function addToWishlist(productId: string): Promise<boolean> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { error } = await supabase.from("wishlists").insert({
    daycare_id: user.id,
    product_id: productId,
  });

  if (error) {
    console.error("Error adding to wishlist:", error);
    return false;
  }

  return true;
}

// 찜 삭제
export async function removeFromWishlist(productId: string): Promise<boolean> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { error } = await supabase
    .from("wishlists")
    .delete()
    .eq("daycare_id", user.id)
    .eq("product_id", productId);

  if (error) {
    console.error("Error removing from wishlist:", error);
    return false;
  }

  return true;
}

// 찜 토글
export async function toggleWishlist(productId: string): Promise<{ added: boolean }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  // 이미 찜한 상품인지 확인
  const { data: existing } = await supabase
    .from("wishlists")
    .select("id")
    .eq("daycare_id", user.id)
    .eq("product_id", productId)
    .single();

  if (existing) {
    // 이미 찜한 경우 삭제
    await supabase.from("wishlists").delete().eq("id", existing.id);
    return { added: false };
  } else {
    // 찜하지 않은 경우 추가
    await supabase.from("wishlists").insert({
      daycare_id: user.id,
      product_id: productId,
    });
    return { added: true };
  }
}

// 찜 여부 확인
export async function isWishlisted(productId: string): Promise<boolean> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data } = await supabase
    .from("wishlists")
    .select("id")
    .eq("daycare_id", user.id)
    .eq("product_id", productId)
    .single();

  return !!data;
}

// 여러 상품의 찜 여부 확인
export async function getWishlistStatus(
  productIds: string[]
): Promise<Record<string, boolean>> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {};
  }

  const { data } = await supabase
    .from("wishlists")
    .select("product_id")
    .eq("daycare_id", user.id)
    .in("product_id", productIds);

  const result: Record<string, boolean> = {};
  productIds.forEach((id) => {
    result[id] = data?.some((item) => item.product_id === id) || false;
  });

  return result;
}
