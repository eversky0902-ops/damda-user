import { createClient } from "@/lib/supabase/client";

export interface CartItemDB {
  id: string;
  daycare_id: string;
  product_id: string;
  reserved_date: string | null;
  reserved_time: string | null;
  options: {
    participant_count?: number;
    options?: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
    }>;
  } | null;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    thumbnail: string;
    original_price: number;
    sale_price: number;
    region: string | null;
    is_sold_out: boolean;
    min_participants: number;
    max_participants: number;
    business_owner?: {
      name: string;
    };
  };
}

// 장바구니 조회
export async function getCart(): Promise<CartItemDB[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("carts")
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
        is_sold_out,
        min_participants,
        max_participants,
        business_owner:business_owners (
          name
        )
      )
    `
    )
    .eq("daycare_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching cart:", error);
    return [];
  }

  return data || [];
}

// 장바구니 추가
export async function addToCart(item: {
  productId: string;
  reservedDate?: string;
  reservedTime?: string;
  participantCount?: number;
  options?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}): Promise<boolean> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  // 이미 장바구니에 있는지 확인
  const { data: existing } = await supabase
    .from("carts")
    .select("id")
    .eq("daycare_id", user.id)
    .eq("product_id", item.productId)
    .single();

  const cartData = {
    daycare_id: user.id,
    product_id: item.productId,
    reserved_date: item.reservedDate || null,
    reserved_time: item.reservedTime || null,
    options: {
      participant_count: item.participantCount,
      options: item.options,
    },
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    // 기존 아이템 업데이트
    const { error } = await supabase
      .from("carts")
      .update(cartData)
      .eq("id", existing.id);

    if (error) {
      console.error("Error updating cart item:", error);
      return false;
    }
  } else {
    // 새 아이템 추가
    const { error } = await supabase.from("carts").insert(cartData);

    if (error) {
      console.error("Error adding to cart:", error);
      return false;
    }
  }

  return true;
}

// 장바구니 아이템 업데이트
export async function updateCartItem(
  cartItemId: string,
  updates: {
    reservedDate?: string;
    reservedTime?: string;
    participantCount?: number;
    options?: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
    }>;
  }
): Promise<boolean> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.reservedDate !== undefined) {
    updateData.reserved_date = updates.reservedDate;
  }
  if (updates.reservedTime !== undefined) {
    updateData.reserved_time = updates.reservedTime;
  }
  if (updates.participantCount !== undefined || updates.options !== undefined) {
    // 기존 options 가져오기
    const { data: existing } = await supabase
      .from("carts")
      .select("options")
      .eq("id", cartItemId)
      .single();

    updateData.options = {
      ...(existing?.options || {}),
      ...(updates.participantCount !== undefined && {
        participant_count: updates.participantCount,
      }),
      ...(updates.options !== undefined && { options: updates.options }),
    };
  }

  const { error } = await supabase
    .from("carts")
    .update(updateData)
    .eq("id", cartItemId)
    .eq("daycare_id", user.id);

  if (error) {
    console.error("Error updating cart item:", error);
    return false;
  }

  return true;
}

// 장바구니 아이템 삭제
export async function removeFromCart(cartItemId: string): Promise<boolean> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { error } = await supabase
    .from("carts")
    .delete()
    .eq("id", cartItemId)
    .eq("daycare_id", user.id);

  if (error) {
    console.error("Error removing from cart:", error);
    return false;
  }

  return true;
}

// 상품 ID로 장바구니 아이템 삭제
export async function removeFromCartByProductId(
  productId: string
): Promise<boolean> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { error } = await supabase
    .from("carts")
    .delete()
    .eq("product_id", productId)
    .eq("daycare_id", user.id);

  if (error) {
    console.error("Error removing from cart:", error);
    return false;
  }

  return true;
}

// 장바구니 비우기
export async function clearCart(): Promise<boolean> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { error } = await supabase
    .from("carts")
    .delete()
    .eq("daycare_id", user.id);

  if (error) {
    console.error("Error clearing cart:", error);
    return false;
  }

  return true;
}

// 장바구니 아이템 수 조회
export async function getCartCount(): Promise<number> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("carts")
    .select("*", { count: "exact", head: true })
    .eq("daycare_id", user.id);

  if (error) {
    console.error("Error getting cart count:", error);
    return 0;
  }

  return count || 0;
}

// 상품이 장바구니에 있는지 확인
export async function isInCart(productId: string): Promise<boolean> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data } = await supabase
    .from("carts")
    .select("id")
    .eq("daycare_id", user.id)
    .eq("product_id", productId)
    .single();

  return !!data;
}

// 예약 가능 여부 확인
export interface UnavailableItem {
  productId: string;
  productName: string;
  reservedDate: string;
  reservedTime: string | null;
  reason: "sold_out" | "time_passed" | "fully_booked" | "already_reserved" | "hold_by_other";
}

// 예약 생성
export interface CreateReservationItem {
  productId: string;
  reservedDate: string;
  reservedTime?: string | null;
  participants: number;
  options?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  totalAmount: number;
}

export interface CreateReservationParams {
  items: CreateReservationItem[];
  reserverInfo: {
    name: string;
    phone: string;
    email?: string;
    daycareName?: string;
  };
  paymentMethod: string;
  paymentTid?: string;
}

/** @deprecated Paid reservations are created only by verified server finalization. */
export async function createReservations(
  _params: CreateReservationParams
): Promise<{ success: boolean; orderId?: string; reservationId?: string; error?: string }> {
  void _params;
  return { success: false, error: "서버 결제 확인을 통해 예약을 확정해주세요." };
}
export async function checkCartAvailability(
  items: Array<{
    productId: string;
    productName: string;
    reservedDate: string;
    reservedTime?: string | null;
    participants: number;
  }>
): Promise<UnavailableItem[]> {
  const supabase = createClient();
  const unavailableItems: UnavailableItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const item of items) {
    // 1. 예약 날짜가 지났는지 확인
    const reservedDate = new Date(item.reservedDate);
    reservedDate.setHours(0, 0, 0, 0);

    if (reservedDate < today) {
      unavailableItems.push({
        productId: item.productId,
        productName: item.productName,
        reservedDate: item.reservedDate,
        reservedTime: item.reservedTime || null,
        reason: "time_passed",
      });
      continue;
    }

    // 2. 오늘인데 예약 시간이 지났는지 확인
    if (reservedDate.getTime() === today.getTime() && item.reservedTime) {
      const [hours, minutes] = item.reservedTime.split(":").map(Number);
      const now = new Date();
      if (now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)) {
        unavailableItems.push({
          productId: item.productId,
          productName: item.productName,
          reservedDate: item.reservedDate,
          reservedTime: item.reservedTime,
          reason: "time_passed",
        });
        continue;
      }
    }

    // 3. 상품이 품절인지 확인
    const { data: product } = await supabase
      .from("products")
      .select("is_sold_out")
      .eq("id", item.productId)
      .single();

    if (product?.is_sold_out) {
      unavailableItems.push({
        productId: item.productId,
        productName: item.productName,
        reservedDate: item.reservedDate,
        reservedTime: item.reservedTime || null,
        reason: "sold_out",
      });
      continue;
    }

    // 4. 1일 1예약 + 홀드 체크 (RPC 함수 사용으로 RLS 우회)
    const { data: availabilityResult, error: availabilityError } = await supabase.rpc(
      "check_reservation_available",
      {
        p_product_id: item.productId,
        p_reserved_date: item.reservedDate,
      }
    );

    if (availabilityError) {
      console.error("Error checking availability:", availabilityError);
      continue;
    }

    if (availabilityResult && !availabilityResult.available) {
      unavailableItems.push({
        productId: item.productId,
        productName: item.productName,
        reservedDate: item.reservedDate,
        reservedTime: item.reservedTime || null,
        reason: availabilityResult.reason as "already_reserved" | "hold_by_other",
      });
      continue;
    }
  }

  return unavailableItems;
}
