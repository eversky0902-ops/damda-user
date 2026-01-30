import { createClient } from "@/lib/supabase/server";

// 예약 타입
export interface Reservation {
  id: string;
  reservation_number: string;
  daycare_id: string;
  product_id: string;
  business_owner_id: string;
  reserved_date: string;
  reserved_time: string | null;
  participant_count: number;
  total_amount: number;
  status: "pending" | "paid" | "confirmed" | "completed" | "cancelled" | "refunded";
  memo: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  product?: {
    id: string;
    name: string;
    thumbnail: string;
    business_owner?: {
      name: string;
    };
  };
}

// 예약 단건 조회
export async function getReservationById(
  reservationId: string,
  daycareId: string
): Promise<Reservation | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reservations")
    .select(
      `
      *,
      products:product_id (
        id,
        name,
        thumbnail,
        address,
        address_detail,
        business_owners:business_owner_id (
          name,
          contact_phone
        )
      )
    `
    )
    .eq("id", reservationId)
    .eq("daycare_id", daycareId)
    .single();

  if (error) {
    console.error("Error fetching reservation:", error);
    return null;
  }

  return {
    ...data,
    product: data.products
      ? {
          ...data.products,
          business_owner: data.products.business_owners as { name: string; contact_phone?: string },
        }
      : undefined,
  };
}

// 예약 목록 조회
export async function getMyReservations(
  daycareId: string,
  status?: string,
  page = 1,
  pageSize = 10
): Promise<{ data: Reservation[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("reservations")
    .select(
      `
      *,
      products:product_id (
        id,
        name,
        thumbnail,
        business_owners:business_owner_id (
          name
        )
      )
    `,
      { count: "exact" }
    )
    .eq("daycare_id", daycareId)
    .order("created_at", { ascending: false });

  // 상태 필터링
  if (status && status !== "all") {
    if (status === "ongoing") {
      query = query.in("status", ["pending", "paid", "confirmed"]);
    } else if (status === "cancelled") {
      query = query.in("status", ["cancelled", "refunded"]);
    } else {
      query = query.eq("status", status);
    }
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching reservations:", error);
    return { data: [], total: 0 };
  }

  const reservations = (data || []).map((item) => ({
    ...item,
    product: item.products
      ? {
          ...item.products,
          business_owner: item.products.business_owners as { name: string },
        }
      : undefined,
  }));

  return { data: reservations, total: count || 0 };
}

// 찜 목록 타입
export interface WishlistItem {
  id: string;
  daycare_id: string;
  product_id: string;
  created_at: string;
  product?: {
    id: string;
    name: string;
    thumbnail: string;
    sale_price: number;
    original_price: number;
    region: string | null;
    is_sold_out: boolean;
    business_owner?: {
      name: string;
    };
  };
}

// 찜 목록 조회
export async function getMyWishlist(
  daycareId: string,
  page = 1,
  pageSize = 12
): Promise<{ data: WishlistItem[]; total: number }> {
  const supabase = await createClient();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("wishlists")
    .select(
      `
      *,
      products:product_id (
        id,
        name,
        thumbnail,
        sale_price,
        original_price,
        region,
        is_sold_out,
        business_owners:business_owner_id (
          name
        )
      )
    `,
      { count: "exact" }
    )
    .eq("daycare_id", daycareId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching wishlist:", error);
    return { data: [], total: 0 };
  }

  const wishlist = (data || []).map((item) => ({
    ...item,
    product: item.products
      ? {
          ...item.products,
          business_owner: item.products.business_owners as { name: string },
        }
      : undefined,
  }));

  return { data: wishlist, total: count || 0 };
}

// 내 리뷰 타입
export interface MyReview {
  id: string;
  daycare_id: string;
  product_id: string;
  reservation_id: string;
  rating: number;
  content: string;
  is_visible: boolean;
  is_featured: boolean;
  created_at: string;
  product?: {
    id: string;
    name: string;
    thumbnail: string;
  };
  images?: {
    id: string;
    image_url: string;
  }[];
}

// 내 리뷰 목록 조회
export async function getMyReviews(
  daycareId: string,
  page = 1,
  pageSize = 10
): Promise<{ data: MyReview[]; total: number }> {
  const supabase = await createClient();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("reviews")
    .select(
      `
      *,
      products:product_id (
        id,
        name,
        thumbnail
      ),
      review_images (
        id,
        image_url
      )
    `,
      { count: "exact" }
    )
    .eq("daycare_id", daycareId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching my reviews:", error);
    return { data: [], total: 0 };
  }

  const reviews = (data || []).map((item) => ({
    ...item,
    product: item.products as MyReview["product"],
    images: item.review_images as MyReview["images"],
  }));

  return { data: reviews, total: count || 0 };
}

// 리뷰 작성 가능한 예약 조회
export async function getReviewableReservations(
  daycareId: string
): Promise<Reservation[]> {
  const supabase = await createClient();

  // 완료된 예약 중 리뷰가 없는 것
  const { data: reservations, error } = await supabase
    .from("reservations")
    .select(
      `
      *,
      products:product_id (
        id,
        name,
        thumbnail
      )
    `
    )
    .eq("daycare_id", daycareId)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  if (error || !reservations) {
    console.error("Error fetching reviewable reservations:", error);
    return [];
  }

  // 리뷰가 이미 있는 예약 조회
  const { data: existingReviews } = await supabase
    .from("reviews")
    .select("reservation_id")
    .eq("daycare_id", daycareId);

  const reviewedReservationIds = new Set(
    existingReviews?.map((r) => r.reservation_id) || []
  );

  // 리뷰가 없는 예약만 반환
  return reservations.filter((r) => !reviewedReservationIds.has(r.id)).map((item) => ({
    ...item,
    product: item.products as Reservation["product"],
  }));
}

// 내 문의 타입
export interface MyInquiry {
  id: string;
  daycare_id: string;
  category: string;
  title: string;
  content: string;
  status: "pending" | "answered";
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

// 내 문의 목록 조회
export async function getMyInquiries(
  daycareId: string,
  page = 1,
  pageSize = 10
): Promise<{ data: MyInquiry[]; total: number }> {
  const supabase = await createClient();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("inquiries")
    .select("*", { count: "exact" })
    .eq("daycare_id", daycareId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching inquiries:", error);
    return { data: [], total: 0 };
  }

  return { data: data || [], total: count || 0 };
}

// 어린이집 정보 조회
export interface DaycareInfo {
  id: string;
  email: string;
  name: string;
  representative: string | null;
  contact_name: string;
  contact_phone: string;
  business_number: string | null;
  license_number: string;
  address: string;
  address_detail: string | null;
  capacity: number | null;
  status: "pending" | "requested" | "approved" | "rejected";
  created_at: string;
}

export async function getDaycareInfo(daycareId: string): Promise<DaycareInfo | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("daycares")
    .select("*")
    .eq("id", daycareId)
    .single();

  if (error) {
    console.error("Error fetching daycare info:", error);
    return null;
  }

  return data;
}

// 예약 통계
export interface ReservationStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

export async function getReservationStats(daycareId: string): Promise<ReservationStats> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reservations")
    .select("status")
    .eq("daycare_id", daycareId);

  if (error || !data) {
    return { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
  }

  return {
    total: data.length,
    pending: data.filter((r) => r.status === "pending" || r.status === "paid").length,
    confirmed: data.filter((r) => r.status === "confirmed").length,
    completed: data.filter((r) => r.status === "completed").length,
    cancelled: data.filter((r) => r.status === "cancelled" || r.status === "refunded").length,
  };
}
