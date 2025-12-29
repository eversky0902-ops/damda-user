// 예약 상태
export const RESERVATION_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;

export const RESERVATION_STATUS_LABEL: Record<string, string> = {
  pending: "대기중",
  confirmed: "확정",
  cancelled: "취소됨",
  completed: "완료",
};

// 페이지네이션
export const DEFAULT_PAGE_SIZE = 12;

// 경로
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  PRODUCTS: "/products",
  PRODUCT_DETAIL: (id: string) => `/products/${id}`,
  CART: "/cart",
  CHECKOUT: "/checkout",
  MY_PAGE: "/mypage",
  MY_RESERVATIONS: "/mypage/reservations",
  MY_WISHLIST: "/mypage/wishlist",
  MY_REVIEWS: "/mypage/reviews",
  NOTICES: "/notices",
  FAQ: "/faq",
  INQUIRY: "/inquiry",
} as const;

// 카테고리 깊이
export const CATEGORY_DEPTH = {
  FIRST: 1,
  SECOND: 2,
  THIRD: 3,
} as const;

// 로컬 스토리지 키
export const STORAGE_KEYS = {
  CART: "damda-cart",
  RECENT_PRODUCTS: "damda-recent-products",
} as const;

// 결제 상태
export const PAYMENT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  REFUNDED: "refunded",
} as const;
