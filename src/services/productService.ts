import { createClient } from "@/lib/supabase/server";

export interface Product {
  id: string;
  name: string;
  summary: string | null;
  thumbnail: string;
  original_price: number;
  sale_price: number;
  region: string | null;
  max_participants: number;
  min_participants: number;
  view_count: number;
  is_visible: boolean;
  is_sold_out: boolean;
  category_id: string | null;
  business_owner_id: string;
  address: string | null;
  duration_minutes: number | null;
  created_at: string;
  // 리뷰 통계 (목록 조회 시 포함)
  review_count?: number;
  average_rating?: number;
  business_owner?: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  category?: {
    id: string;
    name: string;
    parent_id: string | null;
  };
}

export interface ProductFilter {
  categoryId?: string;
  region?: string; // 콤마로 구분된 다중 지역 지원 (예: "서울 강남구,서울 송파구,경기")
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  availableOnly?: boolean; // 예약 가능한 상품만
  sortBy?: "recommended" | "newest" | "sales" | "reviews" | "price_low" | "price_high";
  // 더보기 필터
  durationMin?: number; // 소요시간 최소 (분)
  durationMax?: number; // 소요시간 최대 (분)
  participants?: number; // 인원수 (min <= N <= max 인 상품)
  minRating?: number; // 최소 평점
}

export interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getPopularProducts(limit = 8): Promise<Product[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      business_owners!inner (
        id,
        name,
        logo_url,
        status
      ),
      categories:category_id (
        id,
        name,
        parent_id
      )
    `
    )
    .eq("is_visible", true)
    .eq("business_owners.status", "active")
    .order("view_count", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching popular products:", error);
    return [];
  }

  return (data || []).map((item) => ({
    ...item,
    business_owner: item.business_owners as unknown as Product["business_owner"],
    category: item.categories as unknown as Product["category"],
  }));
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      business_owners!inner (
        id,
        name,
        logo_url,
        status
      ),
      categories:category_id (
        id,
        name,
        parent_id
      )
    `
    )
    .eq("id", id)
    .eq("business_owners.status", "active")
    .single();

  if (error) {
    console.error("Error fetching product:", error);
    return null;
  }

  return {
    ...data,
    business_owner: data.business_owners as unknown as Product["business_owner"],
    category: data.categories as unknown as Product["category"],
  };
}

export async function getProducts(
  filter: ProductFilter = {},
  page = 1,
  pageSize = 12
): Promise<PaginatedProducts> {
  const supabase = await createClient();

  // 카테고리 필터가 있는 경우, 해당 카테고리와 하위 카테고리 ID들을 먼저 조회
  let categoryIds: string[] | null = null;
  if (filter.categoryId) {
    const { data: categories } = await supabase
      .from("categories")
      .select("id")
      .or(`id.eq.${filter.categoryId},parent_id.eq.${filter.categoryId}`);

    categoryIds = categories?.map((c) => c.id) || [filter.categoryId];
  }

  let query = supabase
    .from("products")
    .select(
      `
      *,
      business_owners!inner (
        id,
        name,
        logo_url,
        status
      ),
      categories:category_id (
        id,
        name,
        parent_id
      )
    `,
      { count: "exact" }
    )
    .eq("is_visible", true)
    .eq("business_owners.status", "active");

  // 카테고리 필터 - 대분류 선택 시 하위 카테고리 포함
  if (categoryIds) {
    query = query.in("category_id", categoryIds);
  }

  // 지역 필터 (다중 지역 지원)
  if (filter.region) {
    const regions = filter.region.split(",").map(r => r.trim()).filter(Boolean);

    if (regions.length === 1) {
      // 단일 지역
      const region = regions[0];
      if (region.includes(" ")) {
        // 구/군까지 선택된 경우 정확히 일치하는 것 검색
        query = query.eq("region", region);
      } else {
        // 시/도만 선택된 경우 해당 지역으로 시작하는 모든 지역 검색
        query = query.ilike("region", `${region}%`);
      }
    } else if (regions.length > 1) {
      // 다중 지역: OR 조건으로 연결
      const orConditions = regions.map(region => {
        if (region.includes(" ")) {
          // 구/군까지 선택된 경우 정확히 일치
          return `region.eq.${region}`;
        } else {
          // 시/도만 선택된 경우 해당 지역으로 시작하는 모든 지역
          return `region.ilike.${region}%`;
        }
      }).join(",");
      query = query.or(orConditions);
    }
  }

  // 검색어 필터
  if (filter.search) {
    query = query.or(
      `name.ilike.%${filter.search}%,summary.ilike.%${filter.search}%`
    );
  }

  // 가격 필터
  if (filter.minPrice !== undefined) {
    query = query.gte("sale_price", filter.minPrice);
  }
  if (filter.maxPrice !== undefined) {
    query = query.lte("sale_price", filter.maxPrice);
  }

  // 예약 가능 필터 (품절 제외)
  if (filter.availableOnly) {
    query = query.eq("is_sold_out", false);
  }

  // 소요시간 필터
  if (filter.durationMin !== undefined) {
    query = query.gte("duration_minutes", filter.durationMin);
  }
  if (filter.durationMax !== undefined) {
    query = query.lte("duration_minutes", filter.durationMax);
  }

  // 인원수 필터 (min_participants <= N <= max_participants)
  if (filter.participants !== undefined) {
    query = query
      .lte("min_participants", filter.participants)
      .gte("max_participants", filter.participants);
  }

  // 정렬 (reviews, sales는 클라이언트 사이드에서 처리)
  switch (filter.sortBy) {
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "price_low":
      query = query.order("sale_price", { ascending: true });
      break;
    case "price_high":
      query = query.order("sale_price", { ascending: false });
      break;
    case "sales":
      // TODO: sales_count 필드 추가 후 정렬
      query = query.order("view_count", { ascending: false });
      break;
    case "recommended":
    default:
      query = query.order("view_count", { ascending: false });
      break;
  }

  // 페이지네이션
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching products:", JSON.stringify(error, null, 2));
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Error details:", error.details);
    console.error("Error hint:", error.hint);
    return {
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  // 상품 ID 목록 추출
  const productIds = (data || []).map((item) => item.id);

  // 리뷰 통계 일괄 조회
  const reviewStatsMap = await getProductsReviewStats(productIds);

  // 상품 데이터와 리뷰 통계 병합
  let products = (data || []).map((item) => ({
    ...item,
    business_owner: item.business_owners as unknown as Product["business_owner"],
    category: item.categories as unknown as Product["category"],
    review_count: reviewStatsMap[item.id]?.count || 0,
    average_rating: reviewStatsMap[item.id]?.average || 0,
  }));

  // 리뷰순 정렬 (클라이언트 사이드)
  if (filter.sortBy === "reviews") {
    products = products.sort((a, b) => {
      if (b.average_rating !== a.average_rating) {
        return b.average_rating - a.average_rating;
      }
      return b.review_count - a.review_count;
    });
  }

  // 평점 필터 (클라이언트 사이드 - 리뷰 통계 조인 후 필터링)
  if (filter.minRating !== undefined) {
    products = products.filter((p) => p.average_rating >= filter.minRating!);
  }

  const total = count || 0;

  return {
    data: products,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// 여러 상품의 리뷰 통계를 일괄 조회
async function getProductsReviewStats(
  productIds: string[]
): Promise<Record<string, { count: number; average: number }>> {
  if (productIds.length === 0) return {};

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reviews")
    .select("product_id, rating")
    .in("product_id", productIds)
    .eq("is_visible", true);

  if (error || !data) {
    return {};
  }

  // 상품별로 그룹화하여 통계 계산
  const statsMap: Record<string, { count: number; average: number }> = {};

  productIds.forEach((id) => {
    const reviews = data.filter((r) => r.product_id === id);
    const count = reviews.length;
    const average =
      count > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
        : 0;
    statsMap[id] = { count, average };
  });

  return statsMap;
}

export async function getProductsByCategory(
  categoryId: string,
  limit = 8
): Promise<Product[]> {
  const supabase = await createClient();

  // 해당 카테고리와 하위 카테고리 ID들 가져오기
  const { data: categories } = await supabase
    .from("categories")
    .select("id")
    .or(`id.eq.${categoryId},parent_id.eq.${categoryId}`);

  const categoryIds = categories?.map((c) => c.id) || [categoryId];

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      business_owners!inner (
        id,
        name,
        logo_url,
        status
      )
    `
    )
    .eq("is_visible", true)
    .eq("business_owners.status", "active")
    .in("category_id", categoryIds)
    .order("view_count", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching products by category:", error);
    return [];
  }

  return (data || []).map((item) => ({
    ...item,
    business_owner: item.business_owners as unknown as Product["business_owner"],
  }));
}

// 지역 기반 상품 조회 (추천 섹션용)
export async function getProductsByRegion(
  region: string,
  limit = 4
): Promise<Product[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      business_owners!inner (
        id,
        name,
        logo_url,
        status
      ),
      categories:category_id (
        id,
        name,
        parent_id
      )
    `
    )
    .eq("is_visible", true)
    .eq("business_owners.status", "active")
    .ilike("region", `${region}%`)
    .order("view_count", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching products by region:", error);
    return [];
  }

  return (data || []).map((item) => ({
    ...item,
    business_owner: item.business_owners as unknown as Product["business_owner"],
    category: item.categories as unknown as Product["category"],
  }));
}

// 지역 목록 조회
export async function getRegions(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("region, business_owners!inner (status)")
    .eq("is_visible", true)
    .eq("business_owners.status", "active")
    .not("region", "is", null);

  if (error) {
    console.error("Error fetching regions:", error);
    return [];
  }

  const regions = [...new Set(data?.map((p) => p.region).filter(Boolean))] as string[];
  return regions.sort();
}

// 시간 슬롯 모드 타입
export type TimeSlotMode = "auto" | "custom";

// 시간 슬롯 간격 타입
export type TimeSlotInterval = 30 | 60 | 90 | 120;

// 예약 가능 시간 슬롯 (Admin에서 저장하는 형식)
export interface ProductTimeSlot {
  day: number; // 0=일, 1=월, ..., 6=토
  start: string; // "09:00"
  end: string; // "18:00"
  mode?: TimeSlotMode; // 'auto' | 'custom'
  interval?: TimeSlotInterval; // 30 | 60 | 90 | 120 (auto 모드)
  customSlots?: string[]; // ["10:00", "14:00"] (custom 모드)
}

// 상품 상세 정보 (이미지, 옵션, 예약불가일 포함)
export interface ProductDetail extends Product {
  description: string | null;
  images: ProductImage[];
  options: ProductOption[];
  unavailable_dates: ProductUnavailableDate[];
  available_time_slots: ProductTimeSlot[] | null;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
}

export interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  price: number;
  is_required: boolean;
  sort_order: number;
}

export interface ProductUnavailableDate {
  id: string;
  product_id: string;
  unavailable_date: string;
  reason: string | null;
  is_recurring: boolean;
  day_of_week: number | null;
}

export async function getProductDetail(id: string): Promise<ProductDetail | null> {
  const supabase = await createClient();

  // 모든 쿼리를 병렬로 실행
  const [productResult, imagesResult, optionsResult, unavailableDatesResult] = await Promise.all([
    // 상품 기본 정보
    supabase
      .from("products")
      .select(
        `
        *,
        business_owners!inner (
          id,
          name,
          logo_url,
          address,
          contact_phone,
          status
        ),
        categories:category_id (
          id,
          name,
          parent_id
        )
      `
      )
      .eq("id", id)
      .eq("business_owners.status", "active")
      .single(),
    // 상품 이미지
    supabase
      .from("product_images")
      .select("*")
      .eq("product_id", id)
      .order("sort_order", { ascending: true }),
    // 상품 옵션
    supabase
      .from("product_options")
      .select("*")
      .eq("product_id", id)
      .order("sort_order", { ascending: true }),
    // 예약 불가일
    supabase
      .from("product_unavailable_dates")
      .select("*")
      .eq("product_id", id),
  ]);

  const { data: product, error: productError } = productResult;

  if (productError || !product) {
    console.error("Error fetching product detail:", productError);
    return null;
  }

  // 조회수 증가 (fire-and-forget, await 하지 않음)
  (async () => {
    try {
      await supabase
        .from("products")
        .update({ view_count: (product.view_count || 0) + 1 })
        .eq("id", id);
    } catch (err) {
      console.error("Error updating view count:", err);
    }
  })();

  return {
    ...product,
    business_owner: product.business_owners as unknown as ProductDetail["business_owner"],
    category: product.categories as unknown as ProductDetail["category"],
    images: imagesResult.data || [],
    options: optionsResult.data || [],
    unavailable_dates: unavailableDatesResult.data || [],
    available_time_slots: product.available_time_slots as ProductTimeSlot[] | null,
  };
}

// 상품 리뷰 조회
export interface ProductReview {
  id: string;
  product_id: string;
  daycare_id: string;
  rating: number;
  content: string;
  is_visible: boolean;
  is_featured: boolean;
  created_at: string;
  daycare?: {
    name: string;
  };
  images?: ReviewImage[];
}

export interface ReviewImage {
  id: string;
  review_id: string;
  image_url: string;
  sort_order: number;
}

export async function getProductReviews(
  productId: string,
  page = 1,
  pageSize = 5
): Promise<{ data: ProductReview[]; total: number; totalPages: number }> {
  const supabase = await createClient();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("reviews")
    .select(
      `
      *,
      daycares:daycare_id (
        name
      ),
      review_images (
        id,
        image_url,
        sort_order
      )
    `,
      { count: "exact" }
    )
    .eq("product_id", productId)
    .eq("is_visible", true)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching product reviews:", error);
    return { data: [], total: 0, totalPages: 0 };
  }

  const reviews = (data || []).map((item) => ({
    ...item,
    daycare: item.daycares as unknown as { name: string },
    images: item.review_images as ReviewImage[],
  }));

  const total = count || 0;

  return {
    data: reviews,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

// 상품 리뷰 통계
export interface ReviewStats {
  averageRating: number;
  totalCount: number;
  ratingDistribution: { rating: number; count: number }[];
}

export async function getProductReviewStats(productId: string): Promise<ReviewStats> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("product_id", productId)
    .eq("is_visible", true);

  if (error || !data || data.length === 0) {
    return {
      averageRating: 0,
      totalCount: 0,
      ratingDistribution: [
        { rating: 5, count: 0 },
        { rating: 4, count: 0 },
        { rating: 3, count: 0 },
        { rating: 2, count: 0 },
        { rating: 1, count: 0 },
      ],
    };
  }

  const totalCount = data.length;
  const sum = data.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = Math.round((sum / totalCount) * 10) / 10;

  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: data.filter((r) => r.rating === rating).length,
  }));

  return {
    averageRating,
    totalCount,
    ratingDistribution: distribution,
  };
}
