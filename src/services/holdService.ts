import { createClient } from "@/lib/supabase/client";

export interface HoldResult {
  success: boolean;
  holdId?: string;
  error?: string;
  errorCode?: "ALREADY_HELD" | "ALREADY_RESERVED" | "UNKNOWN";
}

export interface HoldItem {
  productId: string;
  reservedDate: string;
}

/**
 * 결제 홀드 생성
 * - 동시 결제 방지를 위해 상품+날짜 조합을 10분간 잠금
 * - UNIQUE constraint로 race condition 방지
 */
export async function createHold(item: HoldItem): Promise<HoldResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "로그인이 필요합니다.", errorCode: "UNKNOWN" };
  }

  // 먼저 만료된 홀드 정리
  await supabase.rpc("cleanup_expired_holds");

  try {
    const { data, error } = await supabase
      .from("reservation_holds")
      .insert({
        product_id: item.productId,
        reserved_date: item.reservedDate,
        daycare_id: user.id,
      })
      .select("id")
      .single();

    if (error) {
      // UNIQUE constraint 위반 - 이미 다른 사용자가 홀드 중
      if (error.code === "23505") {
        // 해당 홀드가 내 것인지 확인
        const { data: existingHold } = await supabase
          .from("reservation_holds")
          .select("daycare_id")
          .eq("product_id", item.productId)
          .eq("reserved_date", item.reservedDate)
          .gt("expires_at", new Date().toISOString())
          .single();

        if (existingHold?.daycare_id === user.id) {
          // 내 홀드가 이미 있음 - 성공으로 처리
          return { success: true };
        }

        return {
          success: false,
          error: "다른 사용자가 결제를 진행 중입니다.",
          errorCode: "ALREADY_HELD",
        };
      }

      console.error("Error creating hold:", error);
      return { success: false, error: "홀드 생성에 실패했습니다.", errorCode: "UNKNOWN" };
    }

    return { success: true, holdId: data.id };
  } catch (error) {
    console.error("Error creating hold:", error);
    return { success: false, error: "홀드 생성 중 오류가 발생했습니다.", errorCode: "UNKNOWN" };
  }
}

/**
 * 여러 아이템에 대한 홀드 생성
 * - 하나라도 실패하면 이미 생성된 홀드 롤백
 */
export async function createHolds(
  items: HoldItem[]
): Promise<{ success: boolean; results: HoldResult[]; failedItem?: HoldItem }> {
  const results: HoldResult[] = [];
  const createdHolds: HoldItem[] = [];

  for (const item of items) {
    const result = await createHold(item);
    results.push(result);

    if (!result.success) {
      // 실패 시 이미 생성된 홀드 롤백
      if (createdHolds.length > 0) {
        await releaseHolds(createdHolds);
      }
      return { success: false, results, failedItem: item };
    }

    createdHolds.push(item);
  }

  return { success: true, results };
}

/**
 * 특정 아이템의 홀드 해제
 */
export async function releaseHold(item: HoldItem): Promise<boolean> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { error } = await supabase
    .from("reservation_holds")
    .delete()
    .eq("product_id", item.productId)
    .eq("reserved_date", item.reservedDate)
    .eq("daycare_id", user.id);

  if (error) {
    console.error("Error releasing hold:", error);
    return false;
  }

  return true;
}

/**
 * 여러 아이템의 홀드 해제
 */
export async function releaseHolds(items: HoldItem[]): Promise<boolean> {
  const results = await Promise.all(items.map((item) => releaseHold(item)));
  return results.every((result) => result);
}

/**
 * 사용자의 모든 홀드 해제
 */
export async function releaseAllUserHolds(): Promise<boolean> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { error } = await supabase
    .from("reservation_holds")
    .delete()
    .eq("daycare_id", user.id);

  if (error) {
    console.error("Error releasing all holds:", error);
    return false;
  }

  return true;
}

/**
 * 특정 상품+날짜에 유효한 홀드가 있는지 확인
 * - 자신의 홀드는 제외하고 확인
 */
export async function checkHoldByOther(item: HoldItem): Promise<boolean> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 먼저 만료된 홀드 정리
  await supabase.rpc("cleanup_expired_holds");

  const query = supabase
    .from("reservation_holds")
    .select("id, daycare_id")
    .eq("product_id", item.productId)
    .eq("reserved_date", item.reservedDate)
    .gt("expires_at", new Date().toISOString());

  const { data: holds } = await query;

  if (!holds || holds.length === 0) {
    return false;
  }

  // 내 홀드인지 확인
  if (user) {
    return holds.some((hold) => hold.daycare_id !== user.id);
  }

  return holds.length > 0;
}

/**
 * 특정 상품의 예약 불가능한 날짜 목록 조회
 * - 이미 예약이 있는 날짜 (1일 1예약)
 * - 다른 사용자의 홀드가 있는 날짜
 * - RPC 함수를 사용하여 RLS 우회
 */
export async function getUnavailableDates(productId: string): Promise<string[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_unavailable_dates", {
    p_product_id: productId,
  });

  if (error) {
    console.error("Error fetching unavailable dates:", error);
    return [];
  }

  return data || [];
}

/**
 * 특정 날짜에 예약 가능한 상품 ID 목록 조회
 * - 해당 날짜에 예약이 없고, 다른 사용자의 홀드도 없는 상품
 */
export async function getAvailableProductIdsForDate(
  date: string,
  productIds?: string[]
): Promise<string[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 만료된 홀드 정리
  await supabase.rpc("cleanup_expired_holds");

  // 1. 해당 날짜에 예약이 있는 상품 ID 조회
  let reservationsQuery = supabase
    .from("reservations")
    .select("product_id")
    .eq("reserved_date", date)
    .in("status", ["pending", "paid", "confirmed"]);

  if (productIds && productIds.length > 0) {
    reservationsQuery = reservationsQuery.in("product_id", productIds);
  }

  const { data: reservations } = await reservationsQuery;

  const reservedProductIds = new Set(
    (reservations || []).map((r) => r.product_id)
  );

  // 2. 해당 날짜에 다른 사용자의 홀드가 있는 상품 ID 조회
  let holdsQuery = supabase
    .from("reservation_holds")
    .select("product_id, daycare_id")
    .eq("reserved_date", date)
    .gt("expires_at", new Date().toISOString());

  if (productIds && productIds.length > 0) {
    holdsQuery = holdsQuery.in("product_id", productIds);
  }

  const { data: holds } = await holdsQuery;

  // 다른 사용자의 홀드만 추가
  (holds || []).forEach((hold) => {
    if (hold.daycare_id !== user?.id) {
      reservedProductIds.add(hold.product_id);
    }
  });

  // productIds가 주어진 경우, 예약 불가능한 상품을 제외한 목록 반환
  if (productIds && productIds.length > 0) {
    return productIds.filter((id) => !reservedProductIds.has(id));
  }

  // productIds가 없으면 빈 배열 반환 (모든 상품을 조회하는 것은 비효율적)
  return [];
}
