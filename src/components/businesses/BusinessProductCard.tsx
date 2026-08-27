"use client";

import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  ImageIcon,
  Info,
  Users,
} from "lucide-react";
import type { Product } from "@/services/productService";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface BusinessProductCardProps {
  product: Product;
  businessLogo?: string | null;
  selected?: boolean;
  onSelect?: () => void;
  onReserve?: () => void;
  selectionMode?: boolean;
}

function formatPrice(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function plainText(value: string | null) {
  return value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";
}

function getProductImage(product: Product, businessLogo?: string | null) {
  return product.thumbnail || product.images?.[0]?.image_url || businessLogo || null;
}

function getAvailableTimeLabel(product: Product) {
  const slots = product.available_time_slots || [];
  const active = slots.filter((slot) => slot.start && slot.end);
  if (!active.length) return null;
  const starts = active.map((slot) => slot.start).sort();
  const ends = active.map((slot) => slot.end).sort();
  return `${starts[0].slice(0, 5)}~${ends[ends.length - 1].slice(0, 5)}`;
}

export function BusinessProductCard({
  product,
  businessLogo,
  selected = false,
  onSelect,
  onReserve,
  selectionMode = false,
}: BusinessProductCardProps) {
  const image = getProductImage(product, businessLogo);
  const summary = product.summary || plainText(product.description);
  const discountRate = product.original_price > product.sale_price && product.original_price > 0
    ? Math.round(((product.original_price - product.sale_price) / product.original_price) * 100)
    : 0;
  const timeLabel = getAvailableTimeLabel(product);
  const reservable = product.is_visible && !product.is_sold_out;

  return (
    <article
      className={`overflow-hidden rounded-2xl border-2 bg-white transition-all ${
        selected
          ? "border-damda-yellow shadow-[0_0_0_3px_rgba(251,191,36,0.2)]"
          : "border-gray-200 hover:border-damda-yellow/70"
      }`}
      onClick={(event) => {
        if (!selectionMode || !onSelect) return;
        if ((event.target as HTMLElement).closest("button, a")) return;
        onSelect();
      }}
    >
      <div className="grid md:grid-cols-[300px_1fr]">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 md:aspect-auto md:min-h-[280px]">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 767px) 100vw, 300px"
              unoptimized={image.startsWith("http")}
            />
          ) : (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 text-gray-400">
              <ImageIcon className="h-9 w-9" />
              <span className="text-sm">등록된 상품 이미지가 없습니다</span>
            </div>
          )}
          <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold ${reservable ? "bg-white text-damda-teal-dark" : "bg-gray-900/75 text-white"}`}>
            {reservable ? "예약 가능" : product.is_sold_out ? "예약 마감" : "판매 중지"}
          </span>
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex-1 p-5 sm:p-6">
            <h3 className="break-keep text-xl font-bold text-gray-950 sm:text-2xl">{product.name}</h3>
            {summary && (
              <p className="mt-2 line-clamp-2 break-keep text-sm leading-6 text-gray-600 sm:text-base">
                {summary}
              </p>
            )}

            <div className="mt-5 grid grid-cols-1 gap-2.5 text-sm text-gray-700 sm:grid-cols-2">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-damda-teal" />
                최소 {product.min_participants}명 · 최대 {product.max_participants}명
              </span>
              {product.duration_minutes && (
                <span className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-damda-teal" />
                  체험시간 {product.duration_minutes}분
                </span>
              )}
              {(product.minimum_age != null || product.recommended_age_min != null || product.recommended_age_max != null) && (
                <span className="flex items-center gap-2 sm:col-span-2">
                  <Users className="h-4 w-4 text-damda-teal" />
                  {product.minimum_age != null ? `최소 ${product.minimum_age}세` : "연령 제한 없음"}
                  {product.recommended_age_min != null || product.recommended_age_max != null
                    ? ` · 권장 ${product.recommended_age_min ?? 0}~${product.recommended_age_max ?? "이상"}세`
                    : ""}
                </span>
              )}
              {timeLabel && (
                <span className="flex items-center gap-2 sm:col-span-2">
                  <CalendarDays className="h-4 w-4 text-damda-teal" />
                  이용 가능 시간 {timeLabel}
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 bg-gray-50/70 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                {discountRate > 0 && (
                  <div className="mb-1 flex items-center gap-2 text-sm">
                    <span className="font-semibold text-damda-teal-dark">{discountRate}% 할인</span>
                    <span className="text-gray-400 line-through">{formatPrice(product.original_price)}</span>
                  </div>
                )}
                <div className="flex items-baseline gap-1">
                  <strong className="text-2xl font-extrabold tracking-tight text-gray-950 sm:text-3xl">
                    {formatPrice(product.sale_price)}
                  </strong>
                  <span className="text-sm text-gray-500">/ 1인</span>
                </div>
              </div>

              <div className="flex gap-2 sm:min-w-[260px]">
                <div className="md:hidden">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="h-12 px-5">상세보기</Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl px-5 pb-8 pt-6">
                      <SheetHeader className="px-0 text-left">
                        <SheetTitle className="pr-8 text-xl">{product.name}</SheetTitle>
                        <SheetDescription>상품별 이용 조건과 상세정보입니다.</SheetDescription>
                      </SheetHeader>
                      <ProductDetailContent product={product} businessLogo={businessLogo} />
                    </SheetContent>
                  </Sheet>
                </div>
                <div className="hidden md:block">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-12 px-5">상세보기</Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="pr-8 text-2xl">{product.name}</DialogTitle>
                        <DialogDescription>상품별 이용 조건과 상세정보입니다.</DialogDescription>
                      </DialogHeader>
                      <ProductDetailContent product={product} businessLogo={businessLogo} />
                    </DialogContent>
                  </Dialog>
                </div>
                {reservable && selectionMode ? (
                  <Button
                    type="button"
                    onClick={selected ? onReserve : onSelect}
                    className={`h-12 flex-1 px-6 text-gray-950 ${selected ? "bg-damda-yellow-dark" : "bg-damda-yellow hover:bg-damda-yellow-dark"}`}
                  >
                    {selected ? "예약하기" : "상품 선택"}
                  </Button>
                ) : reservable ? (
                  <Button asChild className="h-12 flex-1 bg-damda-yellow px-6 text-gray-950 hover:bg-damda-yellow-dark">
                    <Link href={`/products/${product.id}`}>예약하기</Link>
                  </Button>
                ) : (
                  <Button disabled className="h-12 flex-1">{product.is_sold_out ? "예약마감" : "판매중지"}</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProductDetailContent({ product, businessLogo }: Pick<BusinessProductCardProps, "product" | "businessLogo">) {
  const allImages = [
    ...(product.thumbnail ? [product.thumbnail] : []),
    ...(product.images || []).map((image) => image.image_url),
  ].filter((url, index, list) => url && list.indexOf(url) === index);
  const fallback = allImages.length ? null : businessLogo;
  const timeLabel = getAvailableTimeLabel(product);

  return (
    <div className="mt-3 space-y-6">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {(allImages.length ? allImages : fallback ? [fallback] : []).map((url, index) => (
          <div key={`${url}-${index}`} className="relative aspect-[4/3] w-64 shrink-0 overflow-hidden rounded-xl bg-gray-100">
            <Image src={url!} alt={`${product.name} ${index + 1}`} fill className="object-cover" sizes="256px" unoptimized={url!.startsWith("http")} />
          </div>
        ))}
        {!allImages.length && !fallback && (
          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-400">
            등록된 상품 이미지가 없습니다
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-4 text-sm">
        <DetailStat label="가격" value={`${formatPrice(product.sale_price)} / 1인`} />
        <DetailStat label="인원" value={`${product.min_participants}~${product.max_participants}명`} />
        {product.duration_minutes && <DetailStat label="체험시간" value={`${product.duration_minutes}분`} />}
        {timeLabel && <DetailStat label="이용 가능 시간" value={timeLabel} />}
        {product.minimum_age != null && <DetailStat label="최소 이용 연령" value={`${product.minimum_age}세`} />}
      </div>

      {product.description ? (
        <div>
          <h4 className="mb-3 flex items-center gap-2 font-bold text-gray-950"><Info className="h-4 w-4 text-damda-teal" />상품 상세설명</h4>
          <div
            className="break-words text-sm leading-7 text-gray-700 [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </div>
      ) : product.summary ? (
        <p className="text-sm leading-7 text-gray-700">{product.summary}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <DetailText title="포함 사항" value={product.inclusions} />
        <DetailText title="불포함 사항" value={product.exclusions} />
        <DetailText title="준비물" value={product.materials} />
        <DetailText title="이용 방법" value={product.usage_method} />
        <DetailText title="상품 유의사항" value={product.product_precautions} />
        <DetailText title="예약 공지" value={product.reservation_notice} />
        <DetailText title="취소·환불 안내" value={product.refund_notice} />
        <DetailText title="기타 안내" value={product.other_notice} />
      </div>

      <div className="rounded-xl border border-damda-teal/20 bg-damda-teal-light/50 p-4 text-sm text-gray-700">
        <p className="flex items-center gap-2 font-semibold text-gray-900">
          <CheckCircle2 className="h-4 w-4 text-damda-teal" /> 예약 안내
        </p>
        <p className="mt-2 leading-6">예약 페이지에서 방문일, 이용시간, 인원과 추가 옵션을 선택할 수 있습니다.</p>
      </div>

      <Button asChild className="h-12 w-full bg-damda-yellow text-gray-950 hover:bg-damda-yellow-dark">
        <Link href={`/products/${product.id}`}>{product.is_sold_out ? "상품 페이지 보기" : "이 상품 예약하기"}</Link>
      </Button>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs text-gray-500">{label}</span>
      <strong className="mt-1 block text-gray-900">{value}</strong>
    </div>
  );
}

function DetailText({ title, value }: { title: string; value: string | null }) {
  if (!value) return null;
  return <div className="rounded-xl border border-gray-200 p-4"><h4 className="font-semibold text-gray-950">{title}</h4><p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">{value}</p></div>;
}
