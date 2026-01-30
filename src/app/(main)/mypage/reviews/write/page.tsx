"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  Star,
  Camera,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

interface ReservationInfo {
  id: string;
  reserved_date: string;
  participant_count: number;
  product_id: string;
  product?: {
    id: string;
    name: string;
    thumbnail: string;
  };
}

export default function WriteReviewPage() {
  return (
    <Suspense fallback={<ReviewWriteSkeleton />}>
      <WriteReviewContent />
    </Suspense>
  );
}

function WriteReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservationId");

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [reservation, setReservation] = useState<ReservationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 리뷰 폼 상태
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  const fetchReservation = useCallback(async () => {
    if (!isAuthenticated || !reservationId) {
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("로그인이 필요합니다.");
        setIsLoading(false);
        return;
      }

      // 예약 정보 조회
      const { data: reservationData, error: reservationError } = await supabase
        .from("reservations")
        .select(
          `
          id,
          reserved_date,
          participant_count,
          product_id,
          status,
          products:product_id (
            id,
            name,
            thumbnail
          )
        `
        )
        .eq("id", reservationId)
        .eq("daycare_id", user.id)
        .single();

      if (reservationError || !reservationData) {
        setError("예약 정보를 찾을 수 없습니다.");
        setIsLoading(false);
        return;
      }

      // 체험 완료 상태인지 확인
      if (reservationData.status !== "completed") {
        setError("체험이 완료된 예약만 리뷰를 작성할 수 있습니다.");
        setIsLoading(false);
        return;
      }

      // 이미 리뷰를 작성했는지 확인
      const { data: existingReview } = await supabase
        .from("reviews")
        .select("id")
        .eq("reservation_id", reservationId)
        .eq("daycare_id", user.id)
        .single();

      if (existingReview) {
        setError("이미 리뷰를 작성한 예약입니다.");
        setIsLoading(false);
        return;
      }

      const productData = Array.isArray(reservationData.products)
        ? reservationData.products[0]
        : reservationData.products;

      setReservation({
        ...reservationData,
        product: productData as ReservationInfo["product"],
      });
    } catch (err) {
      console.error("Failed to fetch reservation:", err);
      setError("예약 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, reservationId]);

  useEffect(() => {
    if (!authLoading) {
      fetchReservation();
    }
  }, [authLoading, fetchReservation]);

  // 이미지 미리보기 정리
  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviewUrls]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const totalImages = images.length + newFiles.length;

    if (totalImages > 5) {
      toast.error("이미지는 최대 5장까지 첨부할 수 있습니다.");
      return;
    }

    // 파일 크기 체크 (5MB)
    const oversizedFiles = newFiles.filter(
      (file) => file.size > 5 * 1024 * 1024
    );
    if (oversizedFiles.length > 0) {
      toast.error("이미지 크기는 5MB 이하여야 합니다.");
      return;
    }

    setImages((prev) => [...prev, ...newFiles]);

    // 미리보기 URL 생성
    const newPreviewUrls = newFiles.map((file) => URL.createObjectURL(file));
    setImagePreviewUrls((prev) => [...prev, ...newPreviewUrls]);

    // input 초기화
    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!reservation) return;

    if (rating === 0) {
      toast.error("별점을 선택해주세요.");
      return;
    }

    if (content.trim().length < 10) {
      toast.error("리뷰 내용을 10자 이상 작성해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("로그인이 필요합니다.");
        return;
      }

      // 리뷰 생성
      const { data: newReview, error: reviewError } = await supabase
        .from("reviews")
        .insert({
          daycare_id: user.id,
          product_id: reservation.product_id,
          reservation_id: reservation.id,
          rating,
          content: content.trim(),
          is_visible: true,
          is_featured: false,
        })
        .select()
        .single();

      if (reviewError) {
        console.error("Review create error:", reviewError);
        toast.error("리뷰 작성에 실패했습니다.");
        return;
      }

      // 이미지 업로드
      if (images.length > 0) {
        const uploadPromises = images.map(async (file, index) => {
          const fileExt = file.name.split(".").pop();
          const fileName = `${newReview.id}_${index}_${Date.now()}.${fileExt}`;
          const filePath = `reviews/${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("public")
            .upload(filePath, file);

          if (uploadError) {
            console.error("Image upload error:", uploadError);
            return null;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from("public").getPublicUrl(filePath);

          return publicUrl;
        });

        const uploadedUrls = await Promise.all(uploadPromises);
        const validUrls = uploadedUrls.filter((url) => url !== null);

        // 리뷰 이미지 저장
        if (validUrls.length > 0) {
          const imageInserts = validUrls.map((url) => ({
            review_id: newReview.id,
            image_url: url,
          }));

          await supabase.from("review_images").insert(imageInserts);
        }
      }

      toast.success("리뷰가 작성되었습니다.");
      router.push("/mypage/reviews");
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("리뷰 작성에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return <ReviewWriteSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="px-4 py-16 text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            로그인이 필요합니다
          </h3>
          <Button
            asChild
            className="bg-damda-yellow hover:bg-damda-yellow-dark text-gray-900"
          >
            <Link href="/login">로그인하기</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!reservationId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="px-4 py-16 text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            잘못된 접근입니다
          </h3>
          <p className="text-gray-500 mb-6">예약 정보가 필요합니다.</p>
          <Button asChild variant="outline">
            <Link href="/mypage/reviews">내 리뷰로 돌아가기</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="px-4 py-16 text-center">
          <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
          <Button asChild variant="outline">
            <Link href="/mypage/reviews">내 리뷰로 돌아가기</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="px-4 py-16 text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            예약 정보를 찾을 수 없습니다
          </h3>
          <Button asChild variant="outline">
            <Link href="/mypage/reviews">내 리뷰로 돌아가기</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* 상품 정보 */}
      <section className="bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
            {reservation.product?.thumbnail ? (
              <Image
                src={reservation.product.thumbnail}
                alt={reservation.product?.name || "상품"}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Star className="w-6 h-6 text-gray-300" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 line-clamp-2">
              {reservation.product?.name || "상품 정보 없음"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {format(parseISO(reservation.reserved_date), "M월 d일 (E)", {
                locale: ko,
              })}{" "}
              · {reservation.participant_count}명
            </p>
          </div>
        </div>
      </section>

      {/* 별점 */}
      <section className="bg-white border-b border-gray-200 mt-2">
        <div className="px-4 py-6">
          <h2 className="font-semibold text-gray-900 mb-4 text-center">
            체험은 어떠셨나요?
          </h2>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 ${
                    star <= (hoverRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">
            {rating === 0 && "별점을 선택해주세요"}
            {rating === 1 && "별로예요"}
            {rating === 2 && "그저 그래요"}
            {rating === 3 && "보통이에요"}
            {rating === 4 && "좋아요"}
            {rating === 5 && "최고예요!"}
          </p>
        </div>
      </section>

      {/* 리뷰 내용 */}
      <section className="bg-white border-b border-gray-200 mt-2">
        <div className="px-4 py-4">
          <h2 className="font-semibold text-gray-900 mb-3">리뷰 작성</h2>
          <Textarea
            placeholder="체험에 대한 솔직한 리뷰를 남겨주세요. (최소 10자)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] resize-none"
            maxLength={1000}
          />
          <p className="text-right text-sm text-gray-400 mt-2">
            {content.length}/1000
          </p>
        </div>
      </section>

      {/* 이미지 첨부 */}
      <section className="bg-white border-b border-gray-200 mt-2">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">사진 첨부</h2>
            <span className="text-sm text-gray-500">{images.length}/5</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {/* 이미지 추가 버튼 */}
            {images.length < 5 && (
              <label className="flex-shrink-0 w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-damda-yellow hover:bg-damda-yellow-light/30 transition-colors">
                <Camera className="w-6 h-6 text-gray-400" />
                <span className="text-xs text-gray-400 mt-1">추가</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            )}

            {/* 이미지 미리보기 */}
            {imagePreviewUrls.map((url, index) => (
              <div
                key={index}
                className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden"
              >
                <Image
                  src={url}
                  alt={`Preview ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            * 사진은 최대 5장, 각 5MB 이하
          </p>
        </div>
      </section>

      {/* 제출 버튼 */}
      <div className="px-4 py-6">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || rating === 0 || content.trim().length < 10}
          className="w-full h-12 bg-damda-yellow hover:bg-damda-yellow-dark text-gray-900 font-medium disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              작성 중...
            </>
          ) : (
            "리뷰 등록하기"
          )}
        </Button>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center h-14 px-4">
        <Link
          href="/mypage/reviews"
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="flex-1 text-center font-semibold text-gray-900">
          리뷰 작성
        </h1>
        <div className="w-5" />
      </div>
    </div>
  );
}

function ReviewWriteSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center h-14 px-4">
          <Skeleton className="w-5 h-5" />
          <div className="flex-1 flex justify-center">
            <Skeleton className="w-20 h-5" />
          </div>
          <div className="w-5" />
        </div>
      </div>

      {/* 상품 정보 스켈레톤 */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 px-4 py-4">
          <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>

      {/* 별점 스켈레톤 */}
      <div className="bg-white border-b border-gray-200 mt-2">
        <div className="px-4 py-6">
          <Skeleton className="h-5 w-32 mx-auto mb-4" />
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="w-10 h-10 rounded" />
            ))}
          </div>
        </div>
      </div>

      {/* 리뷰 내용 스켈레톤 */}
      <div className="bg-white border-b border-gray-200 mt-2">
        <div className="px-4 py-4">
          <Skeleton className="h-5 w-20 mb-3" />
          <Skeleton className="h-[150px] w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
