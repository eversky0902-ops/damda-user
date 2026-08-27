import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createCacheClient } from "@/lib/supabase/cache-client";

export interface Product {
  id: string;
  name: string;
  summary: string | null;
  description: string | null;
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
  business_id: string;
  address: string | null;
  address_detail: string | null;
  duration_minutes: number | null;
  minimum_age: number | null;
  recommended_age_min: number | null;
  recommended_age_max: number | null;
  booking_start_date: string | null;
  booking_end_date: string | null;
  booking_cutoff_hours: number;
  allow_same_day_booking: boolean;
  inclusions: string | null;
  exclusions: string | null;
  materials: string | null;
  usage_method: string | null;
  product_precautions: string | null;
  reservation_notice: string | null;
  refund_notice: string | null;
  other_notice: string | null;
  experience_environment: "indoor" | "outdoor" | "mixed" | null;
  operates_in_rain: boolean | null;
  rain_alternative: string | null;
  bus_accessible: boolean | null;
  bus_parking_available: boolean | null;
  dropoff_space_available: boolean | null;
  meal_available: boolean | null;
  lunchbox_allowed: boolean | null;
  restroom_info: string | null;
  child_restroom_available: boolean | null;
  teacher_supplies: string | null;
  child_supplies: string | null;
  provided_supplies: string | null;
  accessibility_info: string | null;
  meeting_point: string | null;
  field_contact: string | null;
  teacher_notes: string | null;
  clothing_guidance: string | null;
  meal_guidance: string | null;
  transportation_guidance: string | null;
  guardian_notes: string | null;
  display_order: number;
  created_at: string;
  // 리뷰 통계 (목록 조회 시 포함)
  review_count?: number;
  average_rating?: number;
  images?: ProductImage[];
  available_time_slots?: ProductTimeSlot[] | null;
  business_owner?: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  business?: {
    id: string;
    name: string;
    logo_url: string | null;
    status?: string;
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
  date?: string; // 특정 날짜에 예약 가능한 상품만 (yyyy-MM-dd)
}

export interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BusinessPlaceProfile {
  introduction: string | null;
  public_phone: string | null;
  website_url: string | null;
  directions: string | null;
  reservation_notice: string | null;
}

export interface BusinessPlaceImage {
  id: string;
  image_url: string;
  caption: string | null;
  is_primary: boolean;
  sort_order: number;
}

export interface BusinessHour {
  id: string;
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  break_start: string | null;
  break_end: string | null;
}

export interface BusinessDetail {
  id: string;
  business_owner_id: string;
  name: string;
  logo_url: string | null;
  introduction: string | null;
  summary: string | null;
  parking_available: boolean;
  parking_notice: string | null;
  facilities: string[];
  common_guide: string | null;
  common_precautions: string | null;
  address: string | null;
  address_detail: string | null;
  contact_phone: string | null;
  latitude: number | null;
  longitude: number | null;
  place_profile: BusinessPlaceProfile | null;
  images: BusinessPlaceImage[];
  hours: BusinessHour[];
}

export interface BusinessOwnerShowcase {
  id: string;
  name: string;
  logo_url: string | null;
  product_count: number;
  min_sale_price: number;
  regions: string[];
  featured_product?: Product;
  products: Product[];
}

export interface PaginatedBusinesses {
  data: BusinessOwnerShowcase[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 인기상품은 모든 방문자에게 동일한 공개 데이터 → 쿠키 없는 클라이언트로 캐싱
const getPopularProductsCached = unstable_cache(
  async (limit: number): Promise<Product[]> => {
    const supabase = createCacheClient();

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
      .eq("is_sold_out", false)
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
  },
  ["popular-products"],
  { revalidate: 300, tags: ["products"] }
);

export async function getPopularProducts(limit = 8): Promise<Product[]> {
  return getPopularProductsCached(limit);
}

/**
 * 홈페이지에는 상품이 아니라 사업주가 한 번만 노출됩니다.
 * 조회수 순 상품을 사업주별로 묶어 대표 상품과 등록 상품 수를 계산합니다.
 */
export async function getPopularBusinessOwners(limit?: number): Promise<BusinessOwnerShowcase[]> {
  // 사업주 콘솔에서 노출 상품을 등록한 직후 홈페이지에 반영되어야 하므로
  // 이 목록은 5분 상품 캐시를 사용하지 않고 공개 데이터를 직접 조회합니다.
  const supabase = createCacheClient();
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      business_owners!inner (id, name, logo_url, status),
      business:businesses!inner (id, name, logo_url, status, address, created_at),
      categories:category_id (id, name, parent_id)
    `)
    .eq("is_visible", true)
    .eq("is_sold_out", false)
    .eq("business_owners.status", "active")
    .eq("business.status", "active")
    .order("view_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Error fetching popular business owners:", error);
    return [];
  }

  const products: Product[] = (data || []).map((item) => ({
    ...item,
    business_owner: item.business_owners as unknown as Product["business_owner"],
    business: item.business as unknown as Product["business"],
    category: item.categories as unknown as Product["category"],
  }));
  // 활성 사업장 전체를 조회하여 상품이 아직 없는 신규 등록 사업장도 메인에 포함합니다.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- businesses 타입은 생성 타입 갱신 전까지 직접 조회합니다.
  const { data: businessRows, error: businessesError } = await (supabase as any)
    .from("businesses")
    .select("id,name,logo_url,status,address,created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (businessesError) {
    console.error("Error fetching active businesses:", businessesError);
    return [];
  }
  type ActiveBusinessRow = {
    id: string;
    name: string;
    logo_url: string | null;
    address: string | null;
  };
  const businessMap = new Map<string, ActiveBusinessRow>(
    (businessRows || []).map((business: ActiveBusinessRow) => [business.id, business])
  );
  const owners = new Map<string, BusinessOwnerShowcase>();

  for (const product of products) {
    // 사용자 URL은 반드시 canonical businesses.id만 사용합니다.
    const owner = businessMap.get(product.business_id) || product.business;
    if (!owner) continue;

    const existing = owners.get(owner.id);
    if (existing) {
      existing.products.push(product);
      existing.product_count += 1;
      existing.min_sale_price = Math.min(existing.min_sale_price, product.sale_price);
      if (product.region && !existing.regions.includes(product.region)) {
        existing.regions.push(product.region);
      }
      continue;
    }

    owners.set(owner.id, {
      id: owner.id,
      name: owner.name,
      logo_url: owner.logo_url,
      product_count: 1,
      min_sale_price: product.sale_price,
      regions: product.region ? [product.region] : [],
      featured_product: product,
      products: [product],
    });
  }

  // 상품이 없는 신규 사업장은 인기 상품 사업장 뒤에 등록 최신순으로 추가됩니다.
  for (const business of businessMap.values()) {
    if (owners.has(business.id)) continue;
    const region = business.address?.trim().split(/\s+/).slice(0, 2).join(" ") || null;
    owners.set(business.id, {
      id: business.id,
      name: business.name,
      logo_url: business.logo_url,
      product_count: 0,
      min_sale_price: 0,
      regions: region ? [region] : [],
      products: [],
    });
  }

  const allOwners = Array.from(owners.values());
  return limit ? allOwners.slice(0, limit) : allOwners;
}

export async function getBusinessOwnerById(id: string): Promise<BusinessDetail | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 사업장/스마트플레이스 테이블은 추가 마이그레이션 이후 생성 타입에 아직 반영되지 않았습니다.
  const { data, error } = await (supabase as any)
    .from("businesses")
    .select("id, business_owner_id, name, logo_url, introduction, summary, parking_available, parking_notice, facilities, common_guide, common_precautions, address, address_detail, contact_phone, latitude, longitude")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (error) return null;

  const [profileResult, imagesResult, hoursResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 생성 타입 갱신 전까지 실제 추가 테이블을 안전하게 조회합니다.
    (supabase as any)
      .from("business_place_profiles")
      .select("introduction, public_phone, website_url, directions, reservation_notice")
      .eq("business_id", id)
      .maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 생성 타입 갱신 전까지 실제 추가 테이블을 안전하게 조회합니다.
    (supabase as any)
      .from("business_place_images")
      .select("id, image_url, caption, is_primary, sort_order")
      .eq("business_id", id)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 생성 타입 갱신 전까지 실제 추가 테이블을 안전하게 조회합니다.
    (supabase as any)
      .from("business_hours")
      .select("id, day_of_week, is_closed, open_time, close_time, break_start, break_end")
      .eq("business_id", id)
      .order("day_of_week", { ascending: true }),
  ]);

  return {
    ...data,
    place_profile: profileResult.data || null,
    images: imagesResult.data || [],
    hours: hoursResult.data || [],
  } as BusinessDetail;
}

async function fetchProductsByBusinessOwner(id: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      business_owners!inner (id, name, logo_url, status),
      categories:category_id (id, name, parent_id)
    `)
    .eq("business_id", id)
    .eq("is_visible", true)
    .eq("is_sold_out", false)
    .eq("business_owners.status", "active")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const productIds = (data || []).map((item) => item.id);
  const [reviewStatsMap, imagesResult] = await Promise.all([
    getProductsReviewStats(productIds),
    productIds.length
      ? supabase
          .from("product_images")
          .select("id, product_id, image_url, sort_order")
          .in("product_id", productIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);
  const business = await getBusinessOwnerById(id);
  const imagesByProduct = new Map<string, ProductImage[]>();

  for (const image of imagesResult.data || []) {
    const current = imagesByProduct.get(image.product_id) || [];
    current.push(image as ProductImage);
    imagesByProduct.set(image.product_id, current);
  }

  return (data || []).map((item) => ({
    ...item,
    business_owner: business ? { id: business.id, name: business.name, logo_url: business.logo_url } : item.business_owners as unknown as Product["business_owner"],
    category: item.categories as unknown as Product["category"],
    review_count: reviewStatsMap[item.id]?.count || 0,
    average_rating: reviewStatsMap[item.id]?.average || 0,
    images: imagesByProduct.get(item.id) || [],
  }));
}

export async function getProductsByBusinessOwner(id: string): Promise<Product[]> {
  try {
    return await fetchProductsByBusinessOwner(id);
  } catch (error) {
    console.error("Error fetching products by business owner:", error);
    return [];
  }
}

export async function getProductsByBusinessOwnerResult(
  id: string
): Promise<{ data: Product[]; error: string | null }> {
  try {
    return { data: await fetchProductsByBusinessOwner(id), error: null };
  } catch (error) {
    console.error("Error fetching products by business owner:", error);
    return {
      data: [],
      error: error instanceof Error ? error.message : "상품 정보를 불러오지 못했습니다.",
    };
  }
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
      business:businesses!inner (
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

  const business = data.business_id ? await getBusinessOwnerById(data.business_id) : null;

  return {
    ...data,
    business_owner: business ? { id: business.id, name: business.name, logo_url: business.logo_url } : data.business_owners as unknown as Product["business_owner"],
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

  // 날짜 필터: 해당 날짜에 예약 불가능한 상품 ID 조회 (1일 1예약)
  let unavailableProductIds: string[] = [];
  if (filter.date) {
    // 해당 날짜에 예약이 있는 상품 조회
    const { data: reservations } = await supabase
      .from("reservations")
      .select("product_id")
      .eq("reserved_date", filter.date)
      .in("status", ["pending", "paid", "confirmed"]);

    const reservedProductIds = (reservations || []).map((r) => r.product_id);

    // 해당 날짜에 홀드가 있는 상품 조회
    const { data: holds } = await supabase
      .from("reservation_holds")
      .select("product_id")
      .eq("reserved_date", filter.date)
      .gt("expires_at", new Date().toISOString());

    const heldProductIds = (holds || []).map((h) => h.product_id);

    // 중복 제거
    unavailableProductIds = [...new Set([...reservedProductIds, ...heldProductIds])];
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
      business:businesses!inner (
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
    .eq("is_sold_out", false)
    .eq("business_owners.status", "active")
    .eq("business.status", "active");

  // 카테고리 필터 - 대분류 선택 시 하위 카테고리 포함
  if (categoryIds) {
    query = query.in("category_id", categoryIds);
  }

  // 날짜 필터 - 해당 날짜에 예약 불가능한 상품 제외
  if (filter.date && unavailableProductIds.length > 0) {
    // Supabase는 NOT IN을 직접 지원하지 않으므로 필터링은 클라이언트에서 처리
    // 하지만 성능을 위해 가능하면 DB에서 필터링
    // not.in 필터 사용
    query = query.not("id", "in", `(${unavailableProductIds.join(",")})`);
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
    business: item.business as unknown as Product["business"],
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
      ),
      business:businesses!inner (
        id,
        name,
        logo_url,
        status
      )
    `
    )
    .eq("is_visible", true)
    .eq("business_owners.status", "active")
    .eq("business.status", "active")
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
    business: item.business as unknown as Product["business"],
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
      business:businesses!inner (
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
    .eq("business.status", "active")
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
    business: item.business as unknown as Product["business"],
    category: item.categories as unknown as Product["category"],
  }));
}

/** 사업장 중심 검색. 상품 필터를 적용한 뒤 사업장 단위로 묶어 노출합니다. */
export async function getBusinesses(
  filter: ProductFilter = {},
  page = 1,
  pageSize = 9
): Promise<PaginatedBusinesses> {
  const productsResult = await getProducts(filter, 1, 500);
  const grouped = new Map<string, BusinessOwnerShowcase>();
  for (const product of productsResult.data) {
    const business = product.business;
    if (!business || business.id !== product.business_id) continue;
    const existing = grouped.get(business.id);
    if (existing) {
      existing.products.push(product); existing.product_count += 1;
      existing.min_sale_price = Math.min(existing.min_sale_price, product.sale_price);
      if (product.region && !existing.regions.includes(product.region)) existing.regions.push(product.region);
    } else grouped.set(business.id, {
      ...business, product_count: 1, min_sale_price: product.sale_price,
      regions: product.region ? [product.region] : [], featured_product: product, products: [product],
    });
  }
  const all = [...grouped.values()];
  const from = (page - 1) * pageSize;
  return { data: all.slice(from, from + pageSize), total: all.length, page, pageSize, totalPages: Math.ceil(all.length / pageSize) };
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
      .order("sort_order", { ascending: true })
      .limit(5),
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

  const business = product.business_id ? await getBusinessOwnerById(product.business_id) : null;

  return {
    ...product,
    business_owner: business ? { id: business.id, name: business.name, logo_url: business.logo_url } : product.business_owners as unknown as ProductDetail["business_owner"],
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
