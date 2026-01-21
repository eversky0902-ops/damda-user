// 사용자 관련 타입
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  daycareId?: string;
  role: "user" | "admin" | "daycare";
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

// 어린이집 관련 타입
export interface DaycareCenter {
  id: string;
  name: string;
  address: string;
  phone?: string;
  representativeName?: string;
  businessNumber?: string;
  createdAt: string;
}

// 상품 관련 타입
export interface Product {
  id: string;
  vendorId: string;
  categoryId: string;
  title: string;
  description: string;
  detailContent: string;
  regularPrice: number;
  salePrice: number;
  minParticipants: number;
  maxParticipants: number;
  isReservationDisabled: boolean;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  images?: ProductImage[];
  vendor?: Vendor;
  category?: Category;
}

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  sortOrder: number;
}

// 카테고리 타입
export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  depth: 1 | 2 | 3;
  sortOrder: number;
  children?: Category[];
}

// 사업주 타입
export interface Vendor {
  id: string;
  businessNumber: string;
  representativeName: string;
  representativePhoto?: string;
  email: string;
  phone: string;
  address: string;
  latitude?: number;
  longitude?: number;
  commissionRate: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

// 예약 타입
export interface Reservation {
  id: string;
  userId: string;
  productId: string;
  reservationDate: string;
  participants: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  totalAmount: number;
  createdAt: string;
  product?: Product;
}

// 리뷰 타입
export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  content: string;
  isVisible: boolean;
  isFeatured: boolean;
  createdAt: string;
  user?: Pick<User, "id" | "name">;
}

// 배너 타입
export interface Banner {
  id: string;
  type: "main" | "sub";
  title: string;
  imageUrl: string;
  linkUrl?: string;
  sortOrder: number;
  startDate: string;
  endDate: string;
  isVisible: boolean;
}

// 공지사항 타입
export interface Notice {
  id: string;
  title: string;
  content: string;
  isVisible: boolean;
  createdAt: string;
}

// FAQ 타입
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isVisible: boolean;
}

// 찜 타입
export interface Wishlist {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  product?: Product;
}

// API 응답 타입
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
